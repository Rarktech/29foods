import { Bot, InlineKeyboard } from "grammy";
import { resolveOrCreateUserByTelegram, parseBotStartPayload } from "@29foods/core";
import { getServiceClient } from "../supabase";
import type { MyContext } from "../bot-context";

export function registerStartHandler(bot: Bot<MyContext>) {
  bot.command("start", async (ctx) => {
    const sourceQr = parseBotStartPayload(ctx.match) ?? undefined;
    const supabase = getServiceClient();

    const user = await resolveOrCreateUserByTelegram(supabase, {
      telegramId: ctx.from!.id,
      name: ctx.from!.first_name ?? null,
      sourceQr,
    });

    ctx.session.sourceQr = sourceQr ?? user.acquired_via_qr ?? null;
    ctx.session.lodge = user.lodge;
    ctx.session.room = user.room;

    const lodgeName = sourceQr ? await lookupLodgeName(supabase, sourceQr) : null;
    const greeting = lodgeName ? `👋 Welcome to 29Foods, ${lodgeName}!` : "👋 Welcome to 29Foods!";

    const keyboard = new InlineKeyboard().text("🍚 See today's menu", "menu:home");

    await ctx.reply(`${greeting}\nWhat are you eating today? 😋`, { reply_markup: keyboard });
  });
}

async function lookupLodgeName(supabase: ReturnType<typeof getServiceClient>, qrCode: string): Promise<string | null> {
  const { data } = await supabase.from("qr_codes").select("lodge_name").eq("qr_code", qrCode).maybeSingle();
  return data?.lodge_name ?? null;
}
