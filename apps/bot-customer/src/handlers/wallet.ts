import { randomUUID } from "node:crypto";
import { Bot, InlineKeyboard } from "grammy";
import {
  formatKobo,
  createWalletTopup,
  initiateFlutterwavePayment,
  parseNairaAmount,
  WALLET_TOPUP_PRESETS_KOBO,
  WALLET_TOPUP_MIN_KOBO,
  WALLET_TOPUP_MAX_KOBO,
} from "@29foods/core";
import { getServiceClient } from "../supabase";
import { getUser } from "../data";
import { clearButtons, respond } from "../ui";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";

/**
 * Two doors into one funding flow: /wallet (always available) and the mid-checkout
 * nudge. Both end at the same amount picker (presets or a typed amount) → Flutterwave
 * link → webhook credit.
 */
export function registerWalletHandlers(bot: Bot<MyContext>) {
  bot.command("wallet", async (ctx) => showWallet(ctx));

  bot.callbackQuery("wallet:home", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showWallet(ctx, { edit: true });
  });

  bot.callbackQuery("wallet:fund", async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    const keyboard = new InlineKeyboard();
    for (const amount of WALLET_TOPUP_PRESETS_KOBO) keyboard.text(formatKobo(amount), `wallet:topup:${amount}`);
    keyboard.row().text("✏️ Another amount", "wallet:custom");
    await ctx.reply(copy.pickTopup, { reply_markup: keyboard });
  });

  bot.callbackQuery("wallet:custom", async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    ctx.session.step = "topup_amount";
    ctx.session.reasked = false;
    await ctx.reply(copy.askTopupAmount(WALLET_TOPUP_MIN_KOBO, WALLET_TOPUP_MAX_KOBO));
  });

  bot.on("message:text", async (ctx, next) => {
    if (ctx.session.step !== "topup_amount" || ctx.message.text.startsWith("/")) return next();
    const amount = parseNairaAmount(ctx.message.text);
    if (amount === null || amount < WALLET_TOPUP_MIN_KOBO || amount > WALLET_TOPUP_MAX_KOBO) {
      // Ask once more, then let the message fall through to normal handling instead of trapping them here.
      if (ctx.session.reasked) {
        ctx.session.step = null;
        ctx.session.reasked = false;
        return next();
      }
      ctx.session.reasked = true;
      await ctx.reply(
        amount === null
          ? copy.badTopupAmount(WALLET_TOPUP_MIN_KOBO, WALLET_TOPUP_MAX_KOBO)
          : copy.topupOutOfRange(WALLET_TOPUP_MIN_KOBO, WALLET_TOPUP_MAX_KOBO),
      );
      return;
    }
    ctx.session.step = null;
    ctx.session.reasked = false;
    await sendTopupLink(ctx, amount);
  });

  bot.callbackQuery(/^wallet:topup:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const amount = Number(ctx.match[1]);
    if (!WALLET_TOPUP_PRESETS_KOBO.includes(amount)) return;
    await clearButtons(ctx);
    await sendTopupLink(ctx, amount);
  });
}

async function sendTopupLink(ctx: MyContext, amount: number) {
  const user = await getUser(ctx);
  const txRef = `29foods_wallet_${randomUUID()}`;
  await createWalletTopup(getServiceClient(), user.id, amount, txRef);
  const { paymentLink } = await initiateFlutterwavePayment({
    txRef,
    amountNaira: amount / 100,
    customerEmail: user.email ?? `telegram-${user.telegram_id}@29foods.app`,
    customerName: user.name,
    customerPhone: user.phone,
    redirectUrl: `https://t.me/${ctx.me.username}?start=wallet`,
  });
  await ctx.reply(copy.topupLink(amount), {
    reply_markup: new InlineKeyboard().url(`👛 Fund ${formatKobo(amount)}`, paymentLink),
  });
}

export async function showWallet(ctx: MyContext, opts: { edit?: boolean } = {}) {
  const user = await getUser(ctx);
  await respond(
    ctx,
    copy.walletScreen(user.wallet_balance),
    new InlineKeyboard().text("➕ Fund wallet", "wallet:fund").text("🍚 Order food", "menu:home"),
    opts,
  );
}
