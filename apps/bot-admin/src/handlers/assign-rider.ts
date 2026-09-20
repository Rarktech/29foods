import { Bot, InlineKeyboard, type Context } from "grammy";
import { pickRiderForPickup } from "@29foods/core";
import { getServiceClient } from "../supabase";

export function registerAssignRiderHandlers(bot: Bot<Context>) {
  bot.callbackQuery(/^order:assign:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const supabase = getServiceClient();

    const { data: order } = await supabase.from("orders").select("lodge").eq("id", orderId).single();
    const { data: riders } = await supabase.from("riders").select("*").in("cycle_status", ["at_base", "heading_back"]);
    const { data: unpickedOrders } = await supabase.from("orders").select("*").eq("order_status", "ready").not("assigned_rider_id", "is", null);

    if (!order || !riders || riders.length === 0) {
      await ctx.answerCallbackQuery({ text: "No riders available right now." });
      return;
    }

    const suggestion = pickRiderForPickup({ riders, unpickedOrders: unpickedOrders ?? [], newOrderLodge: order.lodge });

    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard();
    for (const rider of riders) {
      const label = `${rider.id === suggestion?.riderId ? "⭐ " : ""}${rider.name} (${rider.cycle_status === "at_base" ? "at base" : "heading back"})`;
      keyboard.text(label, `order:rider:${orderId}:${rider.id}`).row();
    }
    await ctx.editMessageText(`${ctx.callbackQuery.message?.text ?? "Order"}\n\nChoose a rider:`, { reply_markup: keyboard });
  });

  bot.callbackQuery(/^order:rider:(.+):(.+)$/, async (ctx) => {
    const [, orderId, riderId] = ctx.match;
    const supabase = getServiceClient();

    const { error } = await supabase.from("orders").update({ assigned_rider_id: riderId! }).eq("id", orderId!);
    const { data: rider } = await supabase.from("riders").select("name").eq("id", riderId!).single();

    if (error) {
      await ctx.answerCallbackQuery({ text: "Couldn't assign that rider." });
      return;
    }

    await ctx.answerCallbackQuery({ text: `Assigned to ${rider?.name ?? "rider"}.` });
    await ctx.editMessageText(`${ctx.callbackQuery.message?.text?.split("\n\nChoose a rider:")[0] ?? "Order"}\n\n🏍️ Assigned to ${rider?.name ?? "rider"}`);
  });
}
