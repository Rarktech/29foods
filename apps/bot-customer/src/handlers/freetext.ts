import { Bot, InlineKeyboard } from "grammy";
import { getOrderHistory } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { fetchMenu, getUser } from "../data";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";
import { sendOpening } from "./start";
import { showMenu, showCart } from "./menu";
import { showUsual } from "./usual";
import { showWallet } from "./wallet";

const GREETING = /^(hi+|hello+|hey+|yo+|good\s+(morning|afternoon|evening)|howdy|sup)\b/i;
const USUAL = /\b(usual|same as (before|last time)|same thing|again)\b/i;
const WALLET = /\b(wallet|balance|top ?up|fund)\b/i;
const MENU = /\b(menu|food|hungry|eat|order)\b/i;
const CART = /\b(cart|basket|checkout)\b/i;
const DIET = /\b(no|without|less|extra|more)\s+(pepper|oil|onions?|salt|spice|maggi|seasoning|tomatoes?|meat|fish|egg|plantain|sauce|stew)\b/gi;
const STOPWORDS = new Set(["the", "one", "with", "and", "i", "want", "please", "a", "an", "some", "plenty", "give", "me", "can", "get", "that", "of", "abeg", "pls"]);

/**
 * The last text handler: someone typed instead of tapping. Match the obvious intent and
 * confirm it back; when it's genuinely unclear, show the buttons again rather than guess.
 */
export function registerFreeTextHandler(bot: Bot<MyContext>) {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return;

    // Dietary notes are remembered silently and applied to every future order.
    const diet = [...text.matchAll(DIET)].map((m) => m[0]!.toLowerCase());
    if (diet.length > 0) {
      const user = await getUser(ctx);
      const existing = (user.dietary_note ?? "").split(/\s*,\s*/).filter(Boolean);
      const merged = [...new Set([...existing, ...diet])].join(", ");
      await getServiceClient().from("users").update({ dietary_note: merged }).eq("id", user.id);
      await ctx.reply(copy.dietSaved(diet.join(", ")));
      return;
    }

    if (GREETING.test(text)) return sendOpening(ctx);
    if (WALLET.test(text)) return showWallet(ctx);
    if (CART.test(text) && ctx.session.cart.length > 0) return showCart(ctx);

    const match = await matchMenuItem(text);
    if (match) {
      await ctx.reply(copy.didYouMean(match.name), {
        reply_markup: new InlineKeyboard().text("✅ Yes, that one", `add:${match.id}`).text("🍚 Show me the menu", "menu:home"),
      });
      return;
    }

    if (USUAL.test(text)) return showUsual(ctx);
    if (MENU.test(text)) return showMenu(ctx);

    const user = await getUser(ctx);
    const { usual } = await getOrderHistory(getServiceClient(), user.id);
    const keyboard = new InlineKeyboard().text("🍚 Menu", "menu:home");
    if (usual) keyboard.text("🔁 My usual", "usual:show");
    keyboard.text("👛 Wallet", "wallet:home");
    await ctx.reply(copy.notSure, { reply_markup: keyboard });
  });
}

/** Word-overlap match against in-stock item names; null when nothing or more than one item matches equally well. */
async function matchMenuItem(text: string) {
  const words = text.toLowerCase().match(/[a-z]+/g)?.filter((w) => w.length > 2 && !STOPWORDS.has(w)) ?? [];
  if (words.length === 0) return null;
  const scored = (await fetchMenu())
    .filter((m) => m.stock > 0)
    .map((m) => {
      const nameWords = m.name.toLowerCase().match(/[a-z]+/g) ?? [];
      const score = words.filter((w) => nameWords.some((n) => n.startsWith(w) || w.startsWith(n))).length;
      return { item: m, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.item.isHero) - Number(a.item.isHero));
  if (scored.length === 0) return null;
  // Two items tied on the same words ("chicken" → Grilled or Peppered) — prefer a hero, else ask via the menu.
  if (scored[1] && scored[1].score === scored[0]!.score && scored[0]!.item.isHero === scored[1].item.isHero) return null;
  return scored[0]!.item;
}
