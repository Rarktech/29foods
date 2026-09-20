import { Bot, InlineKeyboard, type Context } from "grammy";
import { randomUUID } from "node:crypto";
import { recordStatusEvent, applyPendingStatusEvent } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { releaseOrderStock } from "@29foods/core";

export type OrderBotState = "new" | "preparing" | "ready";

export function orderActionKeyboard(orderId: string, state: OrderBotState): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  if (state === "new") {
    keyboard.text("✅ Accept", `order:accept:${orderId}`).text("❌ Reject", `order:reject:${orderId}`);
  } else if (state === "preparing") {
    keyboard.text("🍽️ Mark ready", `order:ready:${orderId}`);
  } else if (state === "ready") {
    keyboard.text("🏍️ Assign rider", `order:assign:${orderId}`);
  }
  return keyboard;
}

export function registerNewOrderHandlers(bot: Bot<Context>) {
  bot.callbackQuery(/^order:accept:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const supabase = getServiceClient();
    await recordStatusEvent(supabase, { orderId, actorType: "admin", actorId: null, toStatus: "preparing", clientOpId: randomUUID() });
    const { data: events } = await supabase.from("order_status_events").select("id").eq("order_id", orderId).eq("applied", false);
    for (const event of events ?? []) await applyPendingStatusEvent(supabase, event.id);

    await ctx.answerCallbackQuery({ text: "Accepted — now preparing." });
    await ctx.editMessageReplyMarkup({ reply_markup: orderActionKeyboard(orderId, "preparing") });
  });

  bot.callbackQuery(/^order:reject:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const supabase = getServiceClient();
    await releaseOrderStock(supabase, orderId);

    await ctx.answerCallbackQuery({ text: "Order rejected — stock released." });
    await ctx.editMessageText(`${ctx.callbackQuery.message?.text ?? "Order"}\n\n❌ Rejected`);
  });

  bot.callbackQuery(/^order:ready:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    const supabase = getServiceClient();
    await recordStatusEvent(supabase, { orderId, actorType: "admin", actorId: null, toStatus: "ready", clientOpId: randomUUID() });
    const { data: events } = await supabase.from("order_status_events").select("id").eq("order_id", orderId).eq("applied", false);
    for (const event of events ?? []) await applyPendingStatusEvent(supabase, event.id);

    await ctx.answerCallbackQuery({ text: "Marked ready." });
    await ctx.editMessageReplyMarkup({ reply_markup: orderActionKeyboard(orderId, "ready") });
  });
}
