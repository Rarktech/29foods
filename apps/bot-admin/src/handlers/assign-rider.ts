import { Bot, InlineKeyboard, type Context } from "grammy";
import { pickRiderForPickup, compactId, expandId } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { buildOrderCard, escapeHtml } from "../order-card";
import { manuallyAssigned } from "../realtime/dispatch-watch";

export function registerAssignRiderHandlers(bot: Bot<Context>) {
  bot.callbackQuery(/^order:assign:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const supabase = getServiceClient();

    const { data: order } = await supabase.from("orders").select("lodge").eq("id", orderId).single();
    // Only riders who are active, have joined via their invite (so the rider bot can reach
    // them), and are free or on their way back.
    const { data: riders } = await supabase
      .from("riders")
      .select("*")
      .eq("is_active", true)
      .not("telegram_id", "is", null)
      .in("cycle_status", ["at_base", "heading_back"]);
    const { data: unpickedOrders } = await supabase.from("orders").select("*").eq("order_status", "ready").not("assigned_rider_id", "is", null);

    if (!order || !riders || riders.length === 0) {
      await ctx.answerCallbackQuery({ text: "No riders on shift right now. They tap “I'm available” in the rider bot to come on shift.", show_alert: true });
      return;
    }

    const suggestion = pickRiderForPickup({ riders, unpickedOrders: unpickedOrders ?? [], newOrderLodge: order.lodge });

    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard();
    for (const rider of riders) {
      const label = `${rider.id === suggestion?.riderId ? "⭐ " : ""}${rider.name} (${rider.cycle_status === "at_base" ? "at base" : "heading back"})`;
      // Compact ids: two full UUIDs would overflow Telegram's 64-byte callback_data limit.
      keyboard.text(label, `order:rider:${compactId(orderId)}:${compactId(rider.id)}`).row();
    }
    const card = (await buildOrderCard(orderId)) ?? "Order";
    await ctx.editMessageText(`${card}\n\nChoose a rider:`, { parse_mode: "HTML", reply_markup: keyboard });
  });

  bot.callbackQuery(/^order:rider:([\w-]{22}):([\w-]{22})$/, async (ctx) => {
    const orderId = expandId(ctx.match[1]!);
    const riderId = expandId(ctx.match[2]!);
    const supabase = getServiceClient();

    manuallyAssigned.add(orderId!);
    const { error } = await supabase.from("orders").update({ assigned_rider_id: riderId! }).eq("id", orderId!);
    const { data: rider } = await supabase.from("riders").select("name").eq("id", riderId!).single();

    if (error) {
      await ctx.answerCallbackQuery({ text: "Couldn't assign that rider." });
      return;
    }

    await ctx.answerCallbackQuery({ text: `Assigned to ${rider?.name ?? "rider"}.` });
    const card = (await buildOrderCard(orderId!)) ?? "Order";
    await ctx.editMessageText(`${card}\n\n🏍️ Assigned to ${escapeHtml(rider?.name ?? "rider")}`, { parse_mode: "HTML" });
  });
}
