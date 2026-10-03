import { Bot, InlineKeyboard } from "grammy";
import { parseBotStartPayload, getOrderHistory, isKitchenOpen, timeOfDay } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { getUser, lookupLodgeName } from "../data";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";
import { showWallet } from "./wallet";
import { showOrderStatus } from "./checkout";

export function registerStartHandler(bot: Bot<MyContext>) {
  bot.command("start", async (ctx) => {
    const payload = parseBotStartPayload(ctx.match);
    // /start always gets you out of whatever question was pending (room number, phone…).
    ctx.session.step = null;
    ctx.session.reasked = false;

    // Deep links back from the Flutterwave checkout page.
    if (payload?.startsWith("paid_")) return showOrderStatus(ctx, payload.slice("paid_".length));
    if (payload === "wallet") return showWallet(ctx);

    const lodgeName = payload ? await lookupLodgeName(payload) : null;
    // Only a real lodge code counts as a QR source (users.acquired_via_qr is a FK to qr_codes).
    const sourceQr = lodgeName ? payload! : undefined;
    const user = await getUser(ctx, sourceQr);

    ctx.session.sourceQr = sourceQr ?? user.acquired_via_qr ?? ctx.session.sourceQr;
    if (lodgeName) ctx.session.qrLodge = lodgeName;

    await sendOpening(ctx, { justScannedLodge: lodgeName });
  });

  bot.callbackQuery("remind:open", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await getUser(ctx);
    await getServiceClient().from("users").update({ open_reminder_requested: true }).eq("id", user.id);
    await ctx.editMessageText(copy.reminderSet);
  });
}

/**
 * The first line depends on how someone arrived and who they are: a lodge QR or cold,
 * first time or returning, lapsed or regular, and the time of day.
 */
export async function sendOpening(ctx: MyContext, opts: { justScannedLodge?: string | null } = {}) {
  if (!isKitchenOpen()) {
    await ctx.reply(copy.kitchenClosed(), {
      reply_markup: new InlineKeyboard().text("🔔 Remind me", "remind:open").text("👛 My wallet", "wallet:home"),
    });
    return;
  }

  const user = await getUser(ctx);
  const history = await getOrderHistory(getServiceClient(), user.id);
  const name = copy.firstName(user.name);
  const tod = timeOfDay();

  if (history.paidOrderCount === 0) {
    const text = opts.justScannedLodge ? copy.welcomeFromQr(opts.justScannedLodge) : copy.welcomeCold();
    await ctx.reply(text, {
      reply_markup: new InlineKeyboard().text("🍚 See today's menu", "menu:home").row().text("🔁 I know what I want", "menu:cats"),
    });
    return;
  }

  if (history.daysSinceLastOrder !== null && history.daysSinceLastOrder >= 10) {
    await ctx.reply(copy.greetLapsed(name), {
      reply_markup: new InlineKeyboard().text("🍚 See the menu", "menu:home"),
    });
    return;
  }

  if (history.usual) {
    await ctx.reply(copy.greetWithUsual(name, tod, history.usual.items), {
      reply_markup: new InlineKeyboard().text("🔁 My usual", "usual:show").text("🍚 See the menu", "menu:home"),
    });
    return;
  }

  await ctx.reply(copy.greetReturning(name, tod), {
    reply_markup: new InlineKeyboard().text("🍚 See today's menu", "menu:home").row().text("🔁 I know what I want", "menu:cats"),
  });
}
