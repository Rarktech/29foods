import { Bot, InlineKeyboard, type Context } from "grammy";
import { stockCountFromEmbed } from "@29foods/core";
import { getServiceClient } from "../supabase";

/** Quick mid-service "this just sold out" toggle — zeroes stock_count so it's greyed on both customer surfaces immediately. */
export function registerSoldOutHandlers(bot: Bot<Context>) {
  bot.command("soldout", async (ctx) => {
    await sendSoldOutMenu(ctx);
  });

  bot.callbackQuery("soldout:refresh", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendSoldOutMenu(ctx, true);
  });

  bot.callbackQuery(/^soldout:zero:(.+)$/, async (ctx) => {
    const menuItemId = ctx.match[1]!;
    const supabase = getServiceClient();
    await supabase.from("inventory").update({ stock_count: 0 }).eq("menu_item_id", menuItemId);
    await ctx.answerCallbackQuery({ text: "Marked sold out." });
    await sendSoldOutMenu(ctx, true);
  });
}

async function sendSoldOutMenu(ctx: Context, edit = false) {
  const supabase = getServiceClient();
  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name, is_available, inventory(stock_count)")
    .eq("is_available", true);

  const inStock = (items ?? []).filter((i) => stockCountFromEmbed(i.inventory) > 0);

  if (inStock.length === 0) {
    const text = "Everything is currently sold out.";
    if (edit) await ctx.editMessageText(text);
    else await ctx.reply(text);
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const item of inStock) keyboard.text(`❌ ${item.name}`, `soldout:zero:${item.id}`).row();
  keyboard.text("🔄 Refresh", "soldout:refresh");

  const text = "Tap an item to mark it sold out now:";
  if (edit) await ctx.editMessageText(text, { reply_markup: keyboard });
  else await ctx.reply(text, { reply_markup: keyboard });
}
