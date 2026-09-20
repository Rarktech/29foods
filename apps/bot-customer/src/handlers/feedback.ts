import { Bot } from "grammy";
import { getServiceClient } from "../supabase";
import type { MyContext } from "../bot-context";

export function registerFeedbackHandler(bot: Bot<MyContext>) {
  bot.callbackQuery(/^feedback:(.+):(fire|neutral|down)$/, async (ctx) => {
    const [, orderId, reaction] = ctx.match;
    const supabase = getServiceClient();

    const { data: order } = await supabase.from("orders").select("user_id").eq("id", orderId!).single();
    if (order) {
      await supabase.from("feedback").insert({
        order_id: orderId!,
        user_id: order.user_id,
        reaction: reaction as "fire" | "neutral" | "down",
      });
    }

    await ctx.answerCallbackQuery({ text: "Thanks for the feedback! 🙌" });
    await ctx.editMessageReplyMarkup(); // remove the buttons after voting
  });
}
