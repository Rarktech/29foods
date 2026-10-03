import { Bot, InlineKeyboard } from "grammy";
import { formatKobo, isKitchenOpen } from "@29foods/core";
import { fetchMenu, CATEGORY_LABELS, CATEGORY_ORDER, MAIN_CATEGORIES, type MenuEntry } from "../data";
import { respond } from "../ui";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";
import { startDelivery } from "./delivery";

const CURATED_LIMIT = 8;

export function registerMenuHandlers(bot: Bot<MyContext>) {
  bot.command("menu", async (ctx) => showMenu(ctx));
  bot.callbackQuery("menu:home", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMenu(ctx, { edit: true });
  });

  bot.callbackQuery("menu:cats", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard();
    for (const category of CATEGORY_ORDER) keyboard.text(CATEGORY_LABELS[category]!, `menu:cat:${category}`).row();
    keyboard.text("⬅️ Today's picks", "menu:home");
    await respond(ctx, copy.pickCategory, keyboard, { edit: true });
  });

  bot.callbackQuery(/^menu:cat:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const category = ctx.match[1]!;
    const items = (await fetchMenu()).filter((m) => m.category === category);
    const label = CATEGORY_LABELS[category] ?? category;
    if (!items.some((m) => m.stock > 0)) {
      await respond(ctx, copy.categorySoldOut(label), new InlineKeyboard().text("⬅️ Back", "menu:cats"), { edit: true });
      return;
    }
    const keyboard = itemsKeyboard(items);
    keyboard.text("⬅️ Back", "menu:cats");
    if (ctx.session.cart.length > 0) keyboard.text(`🛒 Cart (${cartCount(ctx)})`, "cart:view");
    await respond(ctx, `${label}:`, keyboard, { edit: true });
  });

  bot.callbackQuery(/^soldout:/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: copy.soldOutToast });
  });

  bot.callbackQuery(/^add:(.+)$/, async (ctx) => {
    if (!isKitchenOpen()) {
      await ctx.answerCallbackQuery();
      await ctx.reply(copy.kitchenClosed(), { reply_markup: new InlineKeyboard().text("🔔 Remind me", "remind:open") });
      return;
    }
    const menu = await fetchMenu();
    const item = menu.find((m) => m.id === ctx.match[1]);
    if (!item || item.stock <= 0) {
      await ctx.answerCallbackQuery({ text: copy.soldOutToast });
      return;
    }
    await ctx.answerCallbackQuery();
    addToCart(ctx, item);

    if (!ctx.session.upsellDone) {
      const offer = pickUpsell(menu, ctx, item);
      if (offer) {
        ctx.session.upsellDone = true;
        const keyboard = new InlineKeyboard().text(`Yes, add ${offer.item.name}`, `up:add:${offer.item.id}`);
        if (offer.second) keyboard.row().text(`${offer.second.name} instead`, `up:add:${offer.second.id}`);
        keyboard.row().text("No thanks", "up:no");
        await ctx.reply(copy.upsell({ offer: offer.item, soldOutName: offer.soldOutName }), { reply_markup: keyboard });
        return;
      }
    }
    await ctx.reply(copy.added(item.name), { reply_markup: anythingElseKeyboard(ctx) });
  });

  // One upsell per order: "no thanks" is accepted silently and never asked again.
  bot.callbackQuery(/^up:add:(.+)$/, async (ctx) => {
    const item = (await fetchMenu()).find((m) => m.id === ctx.match[1]);
    if (!item || item.stock <= 0) {
      await ctx.answerCallbackQuery({ text: copy.soldOutToast });
      return;
    }
    await ctx.answerCallbackQuery();
    addToCart(ctx, item);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await startDelivery(ctx);
  });

  bot.callbackQuery("up:no", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await startDelivery(ctx);
  });

  bot.callbackQuery("cart:view", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCart(ctx, { edit: true });
  });

  bot.callbackQuery(/^cart:rm:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const line = ctx.session.cart.find((l) => l.menuItemId === ctx.match[1]);
    if (line) {
      line.qty -= 1;
      if (line.qty <= 0) ctx.session.cart = ctx.session.cart.filter((l) => l !== line);
    }
    await showCart(ctx, { edit: true });
  });

  bot.callbackQuery("cart:clear", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.cart = [];
    ctx.session.upsellDone = false;
    await respond(ctx, copy.emptyCart, new InlineKeyboard().text("🍚 See the menu", "menu:home"), { edit: true });
  });

  bot.callbackQuery("cart:checkout", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.session.cart.length === 0) {
      await respond(ctx, copy.emptyCart, new InlineKeyboard().text("🍚 See the menu", "menu:home"), { edit: true });
      return;
    }
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await startDelivery(ctx);
  });
}

/** The default view: hero items first, then a short curated list — not the full catalogue or a filter bar. */
export async function showMenu(ctx: MyContext, opts: { edit?: boolean } = {}) {
  if (!isKitchenOpen()) {
    await respond(ctx, copy.kitchenClosed(), new InlineKeyboard().text("🔔 Remind me", "remind:open"), opts);
    return;
  }
  const menu = await fetchMenu();
  if (!menu.some((m) => m.stock > 0)) {
    await respond(ctx, copy.nothingLeft, undefined, opts);
    return;
  }
  // In-stock first so a sold-out item never pushes a real option off the short list; sold-outs stay visible after.
  const curated = [...menu.filter((m) => m.stock > 0), ...menu.filter((m) => m.stock <= 0)].slice(0, CURATED_LIMIT);
  const keyboard = itemsKeyboard(curated);
  keyboard.text("📂 More categories", "menu:cats");
  if (ctx.session.cart.length > 0) keyboard.text(`🛒 Cart (${cartCount(ctx)})`, "cart:view");
  await respond(ctx, copy.menuIntro(), keyboard, opts);
}

export async function showCart(ctx: MyContext, opts: { edit?: boolean } = {}) {
  const cart = ctx.session.cart;
  if (cart.length === 0) {
    await respond(ctx, copy.emptyCart, new InlineKeyboard().text("🍚 See the menu", "menu:home"), opts);
    return;
  }
  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const lines = cart.map((l) => `${l.qty}× ${l.name}, ${formatKobo(l.unitPrice * l.qty)}`).join("\n");
  const keyboard = new InlineKeyboard();
  for (const line of cart) keyboard.text(`➖ ${line.name}`, `cart:rm:${line.menuItemId}`).row();
  keyboard.text("➕ Add more", "menu:home").text("✅ Checkout", "cart:checkout");
  await respond(ctx, `🛒 ${lines}\n\nFood: ${formatKobo(subtotal)}`, keyboard, opts);
}

function itemsKeyboard(items: MenuEntry[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const item of items) {
    if (item.stock > 0) {
      keyboard.text(`${item.isHero ? "🔥 " : ""}${item.name}, ${formatKobo(item.price)}`, `add:${item.id}`).row();
    } else {
      // Shown, not hidden: a vanished item reads as a bug, a visibly sold-out one reads as honest.
      keyboard.text(`🚫 ${item.name} (sold out)`, `soldout:${item.id}`).row();
    }
  }
  return keyboard;
}

function anythingElseKeyboard(ctx: MyContext): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ That's all", "cart:checkout")
    .text("➕ Add more", "menu:home")
    .row()
    .text(`🛒 Cart (${cartCount(ctx)})`, "cart:view");
}

function addToCart(ctx: MyContext, item: MenuEntry) {
  const existing = ctx.session.cart.find((l) => l.menuItemId === item.id);
  if (existing) existing.qty += 1;
  else ctx.session.cart.push({ menuItemId: item.id, name: item.name, unitPrice: item.price, qty: 1, category: item.category });
  ctx.session.nudgeSent = false;
}

function cartCount(ctx: MyContext): number {
  return ctx.session.cart.reduce((n, l) => n + l.qty, 0);
}

/**
 * One add-on tied to what was just picked: a main gets a drink, a protein on its own
 * gets a rice, a snack gets a drink. Skipped if the cart already has that category.
 */
function pickUpsell(menu: MenuEntry[], ctx: MyContext, picked: MenuEntry) {
  let target: string | null = null;
  if (MAIN_CATEGORIES.includes(picked.category) || picked.category === "snack") target = "drink";
  else if (picked.category === "protein") target = ctx.session.cart.some((l) => MAIN_CATEGORIES.includes(l.category)) ? "drink" : "rice";
  if (!target) return null;
  if (ctx.session.cart.some((l) => l.category === target)) return null;

  const candidates = menu.filter((m) => m.category === target);
  const inStock = candidates.filter((m) => m.stock > 0);
  if (inStock.length === 0) return null;
  // If the obvious choice (the first listed) is sold out, say so and offer what's there.
  const soldOutName = candidates[0] && candidates[0].stock <= 0 ? candidates[0].name : null;
  return { item: inStock[0]!, second: inStock[1] ?? null, soldOutName };
}
