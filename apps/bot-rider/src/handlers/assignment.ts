import type { Bot, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { shortOpId, groupItemsByBasket } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { dispatchWaitingOrders, recordDecline } from "../dispatcher";

/**
 * Notifies a rider the moment they're assigned a pickup — whether the dispatcher picked
 * them automatically or an admin assigned them by hand. A single client_op_id is
 * generated here and baked into the action button's callback_data — if the rider's
 * connection drops and Telegram redelivers the same tap, the same op id comes back,
 * so the unique index on order_status_events(order_id, client_op_id) makes it a no-op
 * instead of a duplicate/out-of-order status change.
 */
export function subscribeToAssignments(bot: Bot<Context>) {
  const supabase = getServiceClient();

  supabase
    .channel("bot-rider-assignments")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, async (payload) => {
      try {
        await notifyAssignment(bot, payload.old as { assigned_rider_id?: string | null }, payload.new as AssignmentPayload);
      } catch (err) {
        // Never let one failed message take the whole rider bot down.
        console.error("assignment notify failed:", err);
      }
    })
    .subscribe();
}

interface AssignmentPayload {
  id: string;
  assigned_rider_id: string | null;
  order_status: string;
  items: { name: string; qty: number; basket_label?: string | null }[];
  lodge: string;
  room: string | null;
  payment_status: string;
}

async function notifyAssignment(bot: Bot<Context>, before: { assigned_rider_id?: string | null }, after: AssignmentPayload) {
  const supabase = getServiceClient();
  if (after.assigned_rider_id === (before.assigned_rider_id ?? null)) return;

  // Reassigned from one rider to another: let the first know it's off their list. (A decline
  // already edits the decliner's own message, so a plain unassign needs no note.)
  if (before.assigned_rider_id && after.assigned_rider_id) {
    const { data: previous } = await supabase.from("riders").select("telegram_id").eq("id", before.assigned_rider_id).maybeSingle();
    if (previous?.telegram_id) {
      await bot.api
        .sendMessage(previous.telegram_id, `↪️ Order #${after.id.slice(0, 8)} (${after.lodge}) has been moved off your list.`)
        .catch(() => {});
    }
  }
  if (!after.assigned_rider_id || after.order_status !== "ready") return;

  const { data: rider } = await supabase.from("riders").select("telegram_id").eq("id", after.assigned_rider_id).maybeSingle();
  if (!rider?.telegram_id) return;

  const { data: user } = await supabase.from("orders").select("user_id, users(name, phone)").eq("id", after.id).single();
  const customer =
    user && Array.isArray(user.users) ? user.users[0] : (user?.users as { name: string | null; phone: string | null } | null);
  const phone = customer?.phone;
  const customerName = customer?.name?.trim();

  // Split orders list each named pack, so the rider hands the right one to the right person.
  const packs = groupItemsByBasket(after.items, customer?.name);
  const listItems = (items: typeof after.items) => items.map((i) => `${i.qty}x ${i.name}`).join(", ");
  const itemsText =
    packs.length > 1 ? `${packs.length} packs:\n${packs.map((p) => `📦 ${p.label}: ${listItems(p.items)}`).join("\n")}` : listItems(after.items);
  // Short on purpose: Telegram caps callback_data at 64 bytes and the order id already takes 36.
  const clientOpId = shortOpId();
  const keyboard = new InlineKeyboard()
    .text("📦 Picked up", `rider:pickedup:${after.id}:${clientOpId}`)
    .row()
    .text("❌ Can't take it", `rider:decline:${after.id}`);

  await bot.api.sendMessage(
    rider.telegram_id,
    `🔔 New delivery #${after.id.slice(0, 8)}\n${customerName ? `👤 ${customerName}\n` : ""}${itemsText}\n📍 ${after.lodge}${after.room ? `, ${after.room}` : ""}\n` +
      `${phone ? `☎️ ${phone} · ` : ""}${after.payment_status === "paid" ? "PAID ✅" : ""}\n\nIt's ready at the kitchen, pick it up now.`,
    { reply_markup: keyboard },
  );
}

export function registerDeclineHandler(bot: Bot<Context>) {
  bot.callbackQuery(/^rider:decline:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const supabase = getServiceClient();
    const { data: rider } = await supabase.from("riders").select("id").eq("telegram_id", ctx.from!.id).maybeSingle();
    if (!rider) {
      await ctx.answerCallbackQuery();
      return;
    }

    // Only release it if it's still theirs and not picked up yet.
    const { data: released } = await supabase
      .from("orders")
      .update({ assigned_rider_id: null })
      .eq("id", orderId)
      .eq("assigned_rider_id", rider.id)
      .eq("order_status", "ready")
      .select("id");

    if (!released || released.length === 0) {
      await ctx.answerCallbackQuery({
        text: "That order isn't yours to decline any more.",
      });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      return;
    }

    recordDecline(orderId, rider.id);
    await ctx.answerCallbackQuery({
      text: "No problem, passing it to someone else.",
    });
    await ctx.editMessageText(`❌ You passed on order #${orderId.slice(0, 8)}. It's gone to the next free rider.`).catch(() => {});
    void dispatchWaitingOrders();
  });
}
