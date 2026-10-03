import { Bot, InlineKeyboard, type Context } from "grammy";
import { claimRiderInvite, RiderInviteError } from "@29foods/core";
import { getServiceClient } from "../supabase";

export function registerShiftHandlers(bot: Bot<Context>) {
  bot.command("start", async (ctx) => {
    const supabase = getServiceClient();

    // Invite link from the admin bot: t.me/<rider bot>?start=join_<code>
    const payload = ctx.match.trim();
    if (payload.startsWith("join_")) {
      try {
        const rider = await claimRiderInvite(supabase, payload.slice("join_".length), ctx.from!.id);
        await ctx.reply(`You're in, ${rider.name.split(" ")[0]}! 🏍️ Tap below whenever you're on shift and ready for deliveries.`, {
          reply_markup: new InlineKeyboard().text("🏍️ I'm available", "rider:shift:at_base"),
        });
      } catch (err) {
        if (!(err instanceof RiderInviteError)) throw err;
        await ctx.reply(
          err.reason === "already_linked"
            ? "This Telegram account is already linked to a rider. If that's wrong, ask the admin."
            : "That invite link has expired or was already used. Ask the admin to send a fresh one.",
        );
      }
      return;
    }

    const { data: rider } = await supabase.from("riders").select("*").eq("telegram_id", ctx.from!.id).maybeSingle();

    if (!rider) {
      await ctx.reply("You're not registered as a rider yet. Ask the admin for your invite link.");
      return;
    }
    if (!rider.is_active) {
      await ctx.reply("Your rider account is currently deactivated. Talk to the admin if that's a mistake.");
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
