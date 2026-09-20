import { Bot, InlineKeyboard, type Context } from "grammy";
import { getServiceClient } from "../supabase";

export function registerShiftHandlers(bot: Bot<Context>) {
  bot.command("start", async (ctx) => {
    const supabase = getServiceClient();
    const { data: rider } = await supabase.from("riders").select("*").eq("telegram_id", ctx.from!.id).maybeSingle();

    if (!rider) {
      await ctx.reply("You're not registered as a rider yet — ask the admin to add you.");
      return;
    }

    const keyboard = new InlineKeyboard().text("🏍️ I'm available", "rider:shift:at_base");
    await ctx.reply(`Welcome back, ${rider.name}! Ready for your shift?`, { reply_markup: keyboard });
  });

  bot.callbackQuery("rider:shift:at_base", async (ctx) => {
    await setCycleStatus(ctx, "at_base");
    await ctx.answerCallbackQuery({ text: "You're on shift — at base." });
    await ctx.editMessageText("🏍️ You're available at base. New deliveries will come through here.");
  });

  bot.callbackQuery("rider:shift:back_at_base", async (ctx) => {
    await setCycleStatus(ctx, "at_base");
    await ctx.answerCallbackQuery({ text: "Welcome back to base." });
    await ctx.editMessageText("🏍️ Back at base — ready for the next drop.");
  });
}

async function setCycleStatus(ctx: Context, status: "at_base" | "heading_back" | "out_delivering" | "offline") {
  const supabase = getServiceClient();
  await supabase.from("riders").update({ cycle_status: status }).eq("telegram_id", ctx.from!.id);
}
