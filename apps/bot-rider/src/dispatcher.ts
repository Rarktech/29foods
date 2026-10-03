import { pickRiderForPickup } from "@29foods/core";
import { getServiceClient } from "./supabase";

const SWEEP_EVERY_MS = 30_000;

/** Riders who tapped "Can't take it" on an order — never offered that same order again. */
const declined = new Map<string, Set<string>>();

export function recordDecline(orderId: string, riderId: string) {
  const set = declined.get(orderId) ?? new Set<string>();
  set.add(riderId);
  declined.set(orderId, set);
}

// Every dispatch runs through this one chain, so two triggers firing together (an order
// turning ready while a rider comes on shift) can't both hand out the same rider slot.
let chain: Promise<void> = Promise.resolve();

/** Assigns every ready, unassigned order to the best available rider, oldest order first. */
export function dispatchWaitingOrders(): Promise<void> {
  chain = chain.then(runDispatch).catch((err) => console.error("dispatch failed:", err));
  return chain;
}

async function runDispatch() {
  const supabase = getServiceClient();
  const { data: waiting } = await supabase
    .from("orders")
    .select("id, lodge")
    .eq("order_status", "ready")
    .is("assigned_rider_id", null)
    .order("paid_at", { ascending: true });
  if (!waiting || waiting.length === 0) return;

  for (const order of waiting) {
    // Re-read each time: the previous assignment in this loop changes who's free.
    const [{ data: riders }, { data: unpickedOrders }] = await Promise.all([
      supabase
        .from("riders")
        .select("*")
        .eq("is_active", true)
        .not("telegram_id", "is", null)
        .in("cycle_status", ["at_base", "heading_back"]),
      supabase.from("orders").select("*").eq("order_status", "ready").not("assigned_rider_id", "is", null),
    ]);

    const skip = declined.get(order.id);
    const eligible = (riders ?? []).filter((r) => !skip?.has(r.id));
    const pick = pickRiderForPickup({ riders: eligible, unpickedOrders: unpickedOrders ?? [], newOrderLodge: order.lodge });
    if (!pick) return; // nobody free — the rest wait for the next rider to come on shift

    // Conditional on still being unassigned, so a manual assignment from the admin bot wins.
    // The assignment listener (handlers/assignment.ts) sends the rider their pickup message.
    await supabase.from("orders").update({ assigned_rider_id: pick.riderId }).eq("id", order.id).is("assigned_rider_id", null);
  }
}

/**
 * Triggers: an order turning ready (Realtime), a rider coming on shift or back to base
 * (shift handlers call dispatchWaitingOrders directly), and a periodic sweep as a safety net.
 */
export function startDispatcher() {
  getServiceClient()
    .channel("bot-rider-dispatch")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
      const before = payload.old as { order_status?: string; assigned_rider_id?: string | null };
      const after = payload.new as { order_status: string; assigned_rider_id: string | null };
      if (after.order_status !== "ready" || after.assigned_rider_id) return;
      const justReady = before.order_status !== "ready";
      const justUnassigned = !!before.assigned_rider_id; // a rider declined it
      if (justReady || justUnassigned) void dispatchWaitingOrders();
    })
    .subscribe();

  setInterval(() => void dispatchWaitingOrders(), SWEEP_EVERY_MS);
  void dispatchWaitingOrders();
}
