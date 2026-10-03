import { Bot, InlineKeyboard } from "grammy";
import { PRIZES, pickPrizeIndex, recordSpin, hasSpunForOrder } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { getUser } from "../data";
import { clearButtons } from "../ui";
import { sendConfirmation } from "../notify";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";

const spinning = new Set<string>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stage 5: one spin per paid order, offered only after payment clears so it never reads
 * as a bribe to finish checkout. Prizes are the same table the web wheel uses; wins
 * apply automatically at the next checkout (see buildQuote in checkout.ts).
 */
export function registerSpinHandler(bot: Bot<MyContext>) {
  bot.callbackQuery(/^spin:(.+)$/, async (ctx) => {
    const orderId = ctx.match[1]!;
    if (spinning.has(orderId)) {
      await ctx.answerCallbackQuery();
      return;
    }

    const supabase = getServiceClient();
    const user = await getUser(ctx);
    const { data: order } = await supabase.from("orders").select("user_id, payment_status").eq("id", orderId).maybeSingle();
    if (!order || order.user_id !== user.id || order.payment_status !== "paid") {
      await ctx.answerCallbackQuery();
      return;
    }
    if (await hasSpunForOrder(supabase, orderId)) {
      await ctx.answerCallbackQuery({ text: copy.alreadySpun });
      await clearButtons(ctx);
      return;
    }

    spinning.add(orderId);
    try {
      await ctx.answerCallbackQuery();
      await clearButtons(ctx);
      await ctx.replyWithDice("🎰");
      await sleep(2500); // let the slot animation land before the result

      const index = pickPrizeIndex();
      const prize = PRIZES[index]!;
      if (prize.tryAgain) {
        await recordSpin(supabase, user.id, index);
        await ctx.reply(copy.spinAgain, { reply_markup: new InlineKeyboard().text("🎡 Spin again", `spin:${orderId}`) });
        return;
      }

      try {
        await recordSpin(supabase, user.id, index, orderId);
      } catch (err) {
        if ((err as { code?: string }).code === "23505") return; // spin_wins.order_id unique — already spun
        throw err;
      }
      await ctx.reply(copy.spinResult(prize.key, prize.copy));
      await sendConfirmation(ctx.api, ctx.chat!.id, orderId);
    } finally {
      spinning.delete(orderId);
    }
  });
}
