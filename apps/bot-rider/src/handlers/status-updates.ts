import { Bot, InlineKeyboard, type Context } from "grammy";
import { recordStatusEvent, applyPendingStatusEvent } from "@29foods/core";
import { getServiceClient } from "../supabase";

export function registerStatusHandlers(bot: Bot<Context>) {
  bot.callbackQuery(/^rider:pickedup:(.+):(.+)$/, async (ctx) => {
    const [, orderId, clientOpId] = ctx.match;
    const supabase = getServiceClient();
    const { data: rider } = await supabase.from("riders").select("id").eq("telegram_id", ctx.from!.id).maybeSingle();

    await recordAndApply(orderId!, "out_for_delivery", rider?.id ?? null, clientOpId!);
    if (rider) await supabase.from("riders").update({ cycle_status: "out_delivering" }).eq("id", rider.id);

    await ctx.answerCallbackQuery({ text: "Marked picked up." });
    const keyboard = new InlineKeyboard().text("✅ Delivered", `rider:delivered:${orderId}:${clientOpId}`);
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  });

  bot.callbackQuery(/^rider:delivered:(.+):(.+)$/, async (ctx) => {
    const [, orderId, clientOpId] = ctx.match;
    const supabase = getServiceClient();
    const { data: rider } = await supabase.from("riders").select("id").eq("telegram_id", ctx.from!.id).maybeSingle();

    await recordAndApply(orderId!, "delivered", rider?.id ?? null, `${clientOpId}:delivered`);
    if (rider) await supabase.from("riders").update({ cycle_status: "heading_back" }).eq("id", rider.id);

    await ctx.answerCallbackQuery({ text: "Delivered! 🎉" });
    const keyboard = new InlineKeyboard().text("🏠 I'm at base", "rider:shift:back_at_base");
    await ctx.editMessageText("✅ Delivered. Heading back to base?", { reply_markup: keyboard });
  });
}

async function recordAndApply(orderId: string, toStatus: "out_for_delivery" | "delivered", riderId: string | null, clientOpId: string) {
  const supabase = getServiceClient();
  await recordStatusEvent(supabase, { orderId, actorType: "rider", actorId: riderId, toStatus, clientOpId });
  const { data: event } = await supabase
    .from("order_status_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("client_op_id", clientOpId)
    .single();
  if (event) {
    try {
      await applyPendingStatusEvent(supabase, event.id);
    } catch {
      // Left unapplied — the outbox sweep (src/outbox/processor.ts) will retry it shortly.
    }
  }
}
