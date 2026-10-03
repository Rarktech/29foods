import { Bot, InlineKeyboard, type Context } from "grammy";
import { claimRiderInvite, RiderInviteError } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { dispatchWaitingOrders } from "../dispatcher";

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
    await ctx.answerCallbackQuery({ text: "You're on shift, at base." });
    await ctx.editMessageText("🏍️ You're on shift at base. New deliveries come through here automatically.", { reply_markup: offShiftKeyboard() });
    void dispatchWaitingOrders();
  });

  bot.callbackQuery("rider:shift:back_at_base", async (ctx) => {
    await setCycleStatus(ctx, "at_base");
    await ctx.answerCallbackQuery({ text: "Welcome back to base." });
    await ctx.editMessageText("🏍️ Back at base, ready for the next drop.", { reply_markup: offShiftKeyboard() });
    void dispatchWaitingOrders();
  });

  // With automatic dispatch, going off shift is what stops new orders arriving.
  bot.command("off", async (ctx) => goOffShift(ctx));
  bot.callbackQuery("rider:shift:offline", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await goOffShift(ctx);
  });
}

function offShiftKeyboard() {
  return new InlineKeyboard().text("🔴 Go off shift", "rider:shift:offline");
}

async function goOffShift(ctx: Context) {
  const supabase = getServiceClient();
  const { data: rider } = await supabase.from("riders").select("id").eq("telegram_id", ctx.from!.id).maybeSingle();
  if (!rider) return;
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("assigned_rider_id", rider.id)
    .in("order_status", ["ready", "out_for_delivery"]);
  await setCycleStatus(ctx, "offline");
  await ctx.reply(
    count
      ? `🔴 You're off shift, no new orders will come to you. You still have ${count} order${count === 1 ? "" : "s"} to finish, so tap the buttons on ${count === 1 ? "it" : "them"} as usual.`
      : "🔴 You're off shift. No new orders will come to you until you tap “I'm available” again.",
    { reply_markup: new InlineKeyboard().text("🏍️ I'm available", "rider:shift:at_base") },
  );
}

async function setCycleStatus(ctx: Context, status: "at_base" | "heading_back" | "out_delivering" | "offline") {
  const supabase = getServiceClient();
  await supabase.from("riders").update({ cycle_status: status }).eq("telegram_id", ctx.from!.id);
}
