import { applyAllPendingStatusEvents } from "@29foods/core";
import { getServiceClient } from "../supabase";

/**
 * Safety net for the offline-first flow: catches up any order_status_events that
 * were durably recorded (the rider's tap always writes the row first) but didn't
 * get applied inline — e.g. a transient Supabase hiccup right after the tap landed.
 */
export function startOutboxSweep(intervalMs = 15_000): NodeJS.Timeout {
  const supabase = getServiceClient();
  return setInterval(() => {
    applyAllPendingStatusEvents(supabase).catch((err) => console.error("Outbox sweep failed:", err));
  }, intervalMs);
}
