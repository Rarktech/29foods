import { Bot } from "grammy";
import { getServiceClient } from "../supabase";
import { getUser } from "../data";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";

/**
 * Stage 10: one tap, no survey. Only a 👎 gets a follow-up, and even that is optional —
 * whatever they type next is saved as the reason; anything else just moves on.
 */
export function registerFeedbackHandler(bot: Bot<MyContext>) {
  bot.callbackQuery(/^feedback:(.+):(fire|neutral|down)$/, async (ctx) => {
    const [, orderId, reaction] = ctx.match;
    const supabase = getServiceClient();
    const user = await getUser(ctx);

    const { data: order } = await supabase.from("orders").select("user_id").eq("id", orderId!).maybeSingle();
    const { data: existing } = await supabase.from("feedback").select("id").eq("order_id", orderId!).maybeSingle();
    if (order && order.user_id === user.id && !existing) {
      await supabase.from("feedback").insert({
        order_id: orderId!,
        user_id: order.user_id,
        reaction: reaction as "fire" | "neutral" | "down",
      });
    }

    await ctx.answerCallbackQuery();
    const reply = reaction === "fire" ? copy.feedbackFire : reaction === "neutral" ? copy.feedbackNeutral : copy.feedbackDown;
    await ctx.editMessageText(`${copy.howWasIt} ${reaction === "fire" ? "🔥" : reaction === "neutral" ? "😐" : "👎"}`).catch(() => {});
    await ctx.reply(reply);
    if (reaction === "down") {
      ctx.session.step = "feedback_reason";
      ctx.session.feedbackOrderId = orderId!;
    }
  });

  bot.on("message:text", async (ctx, next) => {
    if (ctx.session.step !== "feedback_reason" || ctx.message.text.startsWith("/")) return next();
    const orderId = ctx.session.feedbackOrderId;
    ctx.session.step = null;
    ctx.session.feedbackOrderId = null;
    if (orderId) {
      await getServiceClient().from("feedback").update({ reason: ctx.message.text.trim().slice(0, 1000) }).eq("order_id", orderId);
    }
    await ctx.reply(copy.feedbackReasonThanks);
  });
}
