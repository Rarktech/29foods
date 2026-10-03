import { InlineKeyboard, type Api } from "grammy";
import { getServiceClient } from "./supabase";
import * as copy from "./copy";

// In-memory guards against double sends (a Realtime reconnect replaying an event, or the
// spin and its fallback timer racing). Losing them on restart costs at most one repeat.
const confirmedOrders = new Set<string>();

/**
 * Stage 8: specific to the actual order every time — items, place, total, the 30-minute
 * promise as plain fact. Sent after the spin result, or by the fallback timer if the
 * customer never taps Spin.
 */
export async function sendConfirmation(api: Api, chatId: number, orderId: string) {
  if (confirmedOrders.has(orderId)) return;
  confirmedOrders.add(orderId);

  const supabase = getServiceClient();
  const { data: order } = await supabase.from("orders").select("user_id, items, lodge, room, total").eq("id", orderId).maybeSingle();
  if (!order) return;
  const items = order.items as unknown as { name: string; qty: number }[];
  await api.sendMessage(chatId, copy.orderConfirmed(items, copy.placeLabel(order.lodge, order.room), order.total));

  // Stage 11: after the very first order, say once that they're on the daily menu list.
  const [{ count }, { data: user }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", order.user_id).eq("payment_status", "paid"),
    supabase.from("users").select("broadcast_opt_out").eq("id", order.user_id).maybeSingle(),
  ]);
  if (count === 1 && user && !user.broadcast_opt_out) await api.sendMessage(chatId, copy.broadcastWelcome);
}

export async function sendFeedbackPrompt(api: Api, chatId: number, orderId: string) {
  const keyboard = new InlineKeyboard()
    .text("🔥", `feedback:${orderId}:fire`)
    .text("😐", `feedback:${orderId}:neutral`)
    .text("👎", `feedback:${orderId}:down`);
  await api.sendMessage(chatId, copy.howWasIt, { reply_markup: keyboard });
}
