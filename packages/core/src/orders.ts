import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@29foods/supabase-client";

type Client = SupabaseClient<Database>;
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = OrderRow["order_status"];
type ActorType = Database["public"]["Tables"]["order_status_events"]["Row"]["actor_type"];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition order from "${from}" to "${to}"`);
  }
}

/**
 * Durable, idempotent status-change record — the offline-resilience mechanism
 * for the rider (and admin) bot. `clientOpId` should be generated at tap time
 * (embedded in the button's callback_data) so a retried/duplicate tap is a
 * no-op (see the unique index on order_status_events(order_id, client_op_id)).
 * Call applyPendingStatusEvent afterwards to actually move `orders.order_status`.
 */
export async function recordStatusEvent(
  supabase: Client,
  params: { orderId: string; actorType: ActorType; actorId: string | null; toStatus: OrderStatus; clientOpId: string },
): Promise<void> {
  const { error } = await supabase.from("order_status_events").insert({
    order_id: params.orderId,
    actor_type: params.actorType,
    actor_id: params.actorId,
    to_status: params.toStatus,
    client_op_id: params.clientOpId,
  });
  // Unique-violation on (order_id, client_op_id) means this exact tap was already recorded — treat as success.
  if (error && error.code !== "23505") throw error;
}

/**
 * Applies one not-yet-applied status event to its order, validating the
 * transition is legal. Safe to call repeatedly (e.g. from a periodic sweep) —
 * already-applied events are skipped.
 */
export async function applyPendingStatusEvent(supabase: Client, eventId: string): Promise<OrderRow | null> {
  const { data: event, error: eventError } = await supabase
    .from("order_status_events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (eventError) throw eventError;
  if (event.applied) return null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", event.order_id)
    .single();
  if (orderError) throw orderError;

  const toStatus = event.to_status as OrderStatus;
  const allowed = VALID_TRANSITIONS[order.order_status];
  if (!allowed.includes(toStatus)) {
    await supabase
      .from("order_status_events")
      .update({ attempts: event.attempts + 1, last_error: `invalid transition ${order.order_status} -> ${toStatus}` })
      .eq("id", eventId);
    throw new InvalidTransitionError(order.order_status, toStatus);
  }

  const deliveredAt = toStatus === "delivered" ? new Date().toISOString() : order.delivered_at;
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ order_status: toStatus, delivered_at: deliveredAt })
    .eq("id", order.id)
    .select("*")
    .single();
  if (updateError) throw updateError;

  await supabase
    .from("order_status_events")
    .update({ applied: true, applied_at: new Date().toISOString(), from_status: order.order_status })
    .eq("id", eventId);

  return updated;
}

/** Sweeps every unapplied event in order, oldest first — the outbox processor's core loop. */
export async function applyAllPendingStatusEvents(supabase: Client): Promise<void> {
  const { data: pending, error } = await supabase
    .from("order_status_events")
    .select("id")
    .eq("applied", false)
    .order("created_at", { ascending: true });
  if (error) throw error;

  for (const event of pending ?? []) {
    try {
      await applyPendingStatusEvent(supabase, event.id);
    } catch {
      // Already logged onto the event row (attempts/last_error) inside applyPendingStatusEvent;
      // move on so one stuck event can't block the rest of the sweep.
    }
  }
}
