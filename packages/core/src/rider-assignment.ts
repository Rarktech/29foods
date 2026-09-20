import type { Database } from "@29foods/supabase-client";

type RiderRow = Database["public"]["Tables"]["riders"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

const MAX_BATCH_SIZE = 3;

/**
 * v1 rider assignment: cycle-status + zone only (v2 adds live location + real
 * distance). Pickup is from the kitchen, so priority is who can reach the SHOP
 * fastest — not who's near the customer:
 *   1. at_base riders (already at the shop)
 *   2. heading_back riders (will be at the shop soon)
 *   3. out_delivering riders are never assigned a new pickup — they're mid-loop
 *
 * Batching: if an at_base rider already has an unpicked-up order for the same
 * lodge (and their batch isn't full), the new order joins that run instead of
 * pulling in a second rider. Once a rider has tapped "picked up" (order_status
 * moves to out_for_delivery), they stop being batchable — new orders go to
 * whoever else is at base.
 */
export function pickRiderForPickup(params: {
  riders: RiderRow[];
  /** Orders already assigned to a rider but not yet picked up (order_status === 'ready'). */
  unpickedOrders: OrderRow[];
  newOrderLodge: string;
}): { riderId: string; batchedWith: string[] } | null {
  const { riders, unpickedOrders, newOrderLodge } = params;

  const atBaseRiders = riders.filter((r) => r.cycle_status === "at_base");
  const headingBackRiders = riders.filter((r) => r.cycle_status === "heading_back");

  const unpickedByRider = new Map<string, OrderRow[]>();
  for (const order of unpickedOrders) {
    if (!order.assigned_rider_id) continue;
    const list = unpickedByRider.get(order.assigned_rider_id) ?? [];
    list.push(order);
    unpickedByRider.set(order.assigned_rider_id, list);
  }

  // 1a. Batch onto an at_base rider already carrying an unpicked order for the same lodge.
  for (const rider of atBaseRiders) {
    const batch = unpickedByRider.get(rider.id) ?? [];
    const sameLodge = batch.filter((o) => o.lodge === newOrderLodge);
    if (sameLodge.length > 0 && batch.length < MAX_BATCH_SIZE) {
      return { riderId: rider.id, batchedWith: sameLodge.map((o) => o.id) };
    }
  }

  // 1b. Otherwise, any at_base rider with no unpicked orders yet.
  const freeAtBase = atBaseRiders.find((r) => (unpickedByRider.get(r.id) ?? []).length === 0);
  if (freeAtBase) return { riderId: freeAtBase.id, batchedWith: [] };

  // 1c. Otherwise, an at_base rider with room left in their batch (different lodge, still under cap).
  const roomyAtBase = atBaseRiders.find((r) => (unpickedByRider.get(r.id) ?? []).length < MAX_BATCH_SIZE);
  if (roomyAtBase) return { riderId: roomyAtBase.id, batchedWith: [] };

  // 2. Riders heading back to the shop.
  if (headingBackRiders.length > 0) {
    return { riderId: headingBackRiders[0]!.id, batchedWith: [] };
  }

  // 3. Nobody available — out_delivering riders are deliberately excluded.
  return null;
}
