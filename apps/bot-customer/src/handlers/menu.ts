import { Bot, InlineKeyboard } from "grammy";
import { formatKobo } from "@29foods/core";
import { getServiceClient } from "../supabase";
import type { MyContext } from "../bot-context";

const CATEGORY_LABELS: Record<string, string> = {
  rice: "🍚 Rice",
  protein: "🍗 Protein",
  drink: "🥤 Drinks",
  snack: "🥟 Snacks",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);

export function registerMenuHandlers(bot: Bot<MyContext>) {
  bot.callbackQuery("menu:home", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard();
    for (const category of CATEGORIES) keyboard.text(CATEGORY_LABELS[category]!, `menu:cat:${category}`).row();
    if (ctx.session.cart.length > 0) keyboard.text("🛒 View cart", "cart:view");
    await ctx.editMessageText("What are you in the mood for?", { reply_markup: keyboard });
  });

  bot.callbackQuery(/^menu:cat:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const category = ctx.match[1] as "rice" | "protein" | "drink" | "snack" | undefined;
    if (!category) return;
    const supabase = getServiceClient();
    const { data: items } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available, inventory(stock_count)")
      .eq("category", category)
      .eq("is_available", true);

    const available = (items ?? []).filter((item) => (Array.isArray(item.inventory) ? (item.inventory[0]?.stock_count ?? 0) : 0) > 0);

    if (available.length === 0) {
      await ctx.editMessageText(`${CATEGORY_LABELS[category] ?? category} is all sold out right now 😔`, {
        reply_markup: new InlineKeyboard().text("⬅️ Back", "menu:home"),
      });
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const item of available) {
      keyboard.text(`${item.name} — ${formatKobo(item.price)}`, `add:${item.id}`).row();
    }
    keyboard.text("⬅️ Back", "menu:home");
    if (ctx.session.cart.length > 0) keyboard.text("🛒 Cart", "cart:view");

    await ctx.editMessageText(`${CATEGORY_LABELS[category] ?? category}:`, { reply_markup: keyboard });
  });

  bot.callbackQuery(/^add:(.+)$/, async (ctx) => {
    const menuItemId = ctx.match[1]!;
    const supabase = getServiceClient();
    const { data: item } = await supabase.from("menu_items").select("id, name, price, category").eq("id", menuItemId).single();
    if (!item) {
      await ctx.answerCallbackQuery({ text: "That item isn't available anymore." });
      return;
    }

    const existing = ctx.session.cart.find((l) => l.menuItemId === item.id);
    if (existing) existing.qty += 1;
    else ctx.session.cart.push({ menuItemId: item.id, name: item.name, unitPrice: item.price, qty: 1 });

    await ctx.answerCallbackQuery({ text: `Added ${item.name} 🛒` });

    // Upsell: once per session, after adding a non-drink item, if there's no drink in the cart yet.
    if (item.category !== "drink" && !ctx.session.upsellShown) {
      const drinkInCart = await cartHasCategory(supabase, ctx.session.cart, "drink");
      if (!drinkInCart) {
        ctx.session.upsellShown = true;
        await maybeShowUpsell(ctx, supabase);
        return;
      }
    }
  });
}

async function cartHasCategory(supabase: ReturnType<typeof getServiceClient>, cart: MyContext["session"]["cart"], category: string) {
  if (cart.length === 0) return false;
  const { data } = await supabase.from("menu_items").select("id, category").in("id", cart.map((l) => l.menuItemId));
  return (data ?? []).some((m) => m.category === category);
}

async function maybeShowUpsell(ctx: MyContext, supabase: ReturnType<typeof getServiceClient>) {
  const { data: drinks } = await supabase
    .from("menu_items")
    .select("id, name, price, is_available, inventory(stock_count)")
    .eq("category", "drink")
    .eq("is_available", true);

  const drink = (drinks ?? []).find((d) => (Array.isArray(d.inventory) ? (d.inventory[0]?.stock_count ?? 0) : 0) > 0);
  if (!drink) return;

  const keyboard = new InlineKeyboard()
    .text(`Yes, add ${drink.name}`, `add:${drink.id}`)
    .text("No thanks", "menu:home");
  await ctx.reply(`🥤 Add a cold ${drink.name} for ${formatKobo(drink.price)}?`, { reply_markup: keyboard });
}
