import { Bot, InlineKeyboard } from "grammy";
import { formatKobo, calculateDeliveryFee, getOrderHistory } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { fetchMenu, getUser } from "../data";
import { clearButtons } from "../ui";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";
import { showMenu, showCart } from "./menu";
import { showSummary } from "./checkout";

export function registerUsualHandlers(bot: Bot<MyContext>) {
  bot.callbackQuery("usual:show", async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    await showUsual(ctx);
  });

  // The four-tap repeat order: usual → yes → pay → (spin).
  bot.callbackQuery("usual:yes", async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    ctx.session.oneOff = null;
    await showSummary(ctx);
  });

  bot.callbackQuery("usual:change", async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    await showCart(ctx);
  });
}

/**
 * Loads the usual into the cart at today's prices. A sold-out item is left in so the
 * summary step can offer the honest "just sold out, want to switch?" swap.
 */
export async function showUsual(ctx: MyContext) {
  const user = await getUser(ctx);
  const { usual } = await getOrderHistory(getServiceClient(), user.id);
  if (!usual) return showMenu(ctx);

  const menu = await fetchMenu();
  ctx.session.cart = usual.items.flatMap((item) => {
    const entry = menu.find((m) => m.id === item.menu_item_id);
    return entry ? [{ menuItemId: entry.id, name: entry.name, unitPrice: entry.price, qty: item.qty, category: entry.category }] : [];
  });
  ctx.session.upsellDone = true; // they know what they want — no add-on question on a repeat
  ctx.session.nudgeSent = false;
  if (ctx.session.cart.length === 0) return showMenu(ctx);

  const subtotal = ctx.session.cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const total = subtotal + calculateDeliveryFee(subtotal);
  const place = user.lodge ? copy.placeLabel(user.lodge, user.room) : copy.placeLabel(usual.lodge, usual.room);
  await ctx.reply(`${copy.itemsLabel(ctx.session.cart)}, ${place}, same as last time, ${formatKobo(total)}. Good to go?`, {
    reply_markup: new InlineKeyboard().text("✅ Yes, order it", "usual:yes").row().text("✏️ Actually, let me change something", "usual:change"),
  });
}
