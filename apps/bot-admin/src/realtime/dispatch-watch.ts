import { InlineKeyboard, type Bot, type Context } from "grammy";
import { getServiceClient } from "../supabase";
import { escapeHtml } from "../order-card";

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID;
const STUCK_AFTER_MS = 3 * 60_000;
const CHECK_EVERY_MS = 60_000;

/** Orders assigned by hand from this bot — the assign handler already reports those, so skip the auto notice. */
export const manuallyAssigned = new Set<string>();
const alerted = new Set<string>();

/**
 * Riders are assigned automatically by the rider bot's dispatcher when an order is marked
 * ready. This keeps the admin in the loop: a one-line notice per assignment, and a single
 * alert if an order has been ready for a while with nobody to take it.
 */
export function watchDispatch(bot: Bot<Context>) {
  if (!ADMIN_CHAT_ID) return;
  const supabase = getServiceClient();

  supabase
    .channel("bot-admin-dispatch")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, async (payload) => {
      const before = payload.old as { assigned_rider_id?: string | null };
      const after = payload.new as { id: string; user_id: string; assigned_rider_id: string | null; order_status: string };
      if (!after.assigned_rider_id || after.assigned_rider_id === before.assigned_rider_id) return;
      if (manuallyAssigned.delete(after.id)) return;

      try {
        const [{ data: rider }, { data: user }] = await Promise.all([
          supabase.from("riders").select("name").eq("id", after.assigned_rider_id).maybeSingle(),
          supabase.from("users").select("name").eq("id", after.user_id).maybeSingle(),
        ]);
        const customer = user?.name?.trim() ? ` (${escapeHtml(user.name.trim().toUpperCase())})` : "";
        await bot.api.sendMessage(
          ADMIN_CHAT_ID,
          `🏍️ #${after.id.slice(0, 8)}${customer} auto-assigned to <b>${escapeHtml(rider?.name ?? "a rider")}</b>`,
          { parse_mode: "HTML" },
        );
      } catch (err) {
        console.error("dispatch notice failed:", err);
      }
    })
    .subscribe();

  setInterval(() => {
    alertStuckOrders(bot).catch((err) => console.error("stuck-order check failed:", err));
  }, CHECK_EVERY_MS);
}

async function alertStuckOrders(bot: Bot<Context>) {
  const supabase = getServiceClient();
  const { data: waiting } = await supabase
    .from("orders")
    .select("id, lodge")
    .eq("order_status", "ready")
    .is("assigned_rider_id", null);
  const fresh = (waiting ?? []).filter((o) => !alerted.has(o.id));
  if (fresh.length === 0) return;

  // When each one was marked ready — from the status-event log, which survives restarts.
  const { data: events } = await supabase
    .from("order_status_events")
    .select("order_id, applied_at")
    .in("order_id", fresh.map((o) => o.id))
    .eq("to_status", "ready")
    .eq("applied", true);
  const readyAt = new Map((events ?? []).map((e) => [e.order_id, e.applied_at ? new Date(e.applied_at).getTime() : Date.now()]));

  for (const order of fresh) {
    const since = readyAt.get(order.id);
    if (!since || Date.now() - since < STUCK_AFTER_MS) continue;
    alerted.add(order.id);
    await bot.api.sendMessage(
      ADMIN_CHAT_ID!,
      `⚠️ #${order.id.slice(0, 8)} (${escapeHtml(order.lodge)}) has been ready for ${Math.round((Date.now() - since) / 60_000)} min with no rider free. ` +
        `It goes to the first rider who comes on shift, or assign one yourself:`,
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("🏍️ Assign manually", `order:assign:${order.id}`) },
    );
  }
}
