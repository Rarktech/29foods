import { Bot, InlineKeyboard, type Context } from "grammy";
import { createRiderWithInvite, refreshRiderInvite, riderInviteLink, setRiderActive, RIDER_INVITE_TTL_HOURS } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { escapeHtml } from "../order-card";

const RIDER_BOT_USERNAME = process.env.RIDER_BOT_USERNAME;
const PHONE = /^\+?[0-9]{10,14}$/;

const STATUS_LABEL: Record<string, string> = {
  at_base: "🟢 at base",
  heading_back: "🟡 heading back",
  out_delivering: "🏍️ out delivering",
  offline: "⚪ off shift",
};

/**
 * Rider onboarding without anyone needing a numeric Telegram id: /addrider creates the
 * rider and returns a one-time link to forward to them; tapping it in the rider bot
 * links their account (see claim_rider_invite).
 */
export function registerRiderHandlers(bot: Bot<Context>) {
  bot.command("addrider", async (ctx) => {
    const parts = ctx.match.trim().split(/\s+/).filter(Boolean);
    const maybePhone = parts.at(-1)?.replace(/[\s-]/g, "");
    const phone = maybePhone && PHONE.test(maybePhone) ? maybePhone : null;
    const name = (phone ? parts.slice(0, -1) : parts).join(" ");
    if (!name) {
      await ctx.reply("Send it like this:\n/addrider Uche Nwankwo 08031234567\n(phone number is optional)");
      return;
    }

    try {
      const rider = await createRiderWithInvite(getServiceClient(), { name, phone });
      await sendInvite(ctx, rider.name, rider.invite_code!);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        await ctx.reply("A rider with that phone number already exists. Use /riders to resend their invite.");
        return;
      }
      throw err;
    }
  });

  bot.command("riders", async (ctx) => showRiders(ctx));
  bot.callbackQuery("riders:list", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showRiders(ctx, true);
  });

  bot.callbackQuery(/^riders:invite:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const rider = await refreshRiderInvite(getServiceClient(), ctx.match[1]!);
    await sendInvite(ctx, rider.name, rider.invite_code!);
  });

  bot.callbackQuery(/^riders:(off|on):(.+)$/, async (ctx) => {
    const [, action, riderId] = ctx.match;
    await setRiderActive(getServiceClient(), riderId!, action === "on");
    await ctx.answerCallbackQuery({ text: action === "on" ? "Rider reactivated." : "Rider deactivated." });
    await showRiders(ctx, true);
  });
}

async function sendInvite(ctx: Context, name: string, code: string) {
  if (!RIDER_BOT_USERNAME) {
    await ctx.reply("RIDER_BOT_USERNAME isn't set in the admin bot's .env, so I can't build the invite link.");
    return;
  }
  const link = riderInviteLink(RIDER_BOT_USERNAME, code);
  await ctx.reply(
    `✅ Invite for <b>${escapeHtml(name)}</b>\n\nForward this link to them. Tapping it connects their Telegram to the rider bot. ` +
      `Works once, expires in ${RIDER_INVITE_TTL_HOURS} hours.\n\n${link}`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
}

async function showRiders(ctx: Context, edit = false) {
  const { data: riders } = await getServiceClient()
    .from("riders")
    .select("id, name, phone, telegram_id, cycle_status, is_active")
    .order("is_active", { ascending: false })
    .order("name");

  if (!riders || riders.length === 0) {
    const text = "No riders yet. Add one with:\n/addrider Uche Nwankwo 08031234567";
    if (edit) await ctx.editMessageText(text);
    else await ctx.reply(text);
    return;
  }

  const lines: string[] = ["🏍️ <b>Riders</b>"];
  const keyboard = new InlineKeyboard();
  for (const r of riders) {
    const state = !r.is_active ? "🚫 deactivated" : !r.telegram_id ? "✉️ invite not accepted yet" : STATUS_LABEL[r.cycle_status] ?? r.cycle_status;
    lines.push(`• ${escapeHtml(r.name)}${r.phone ? ` · ${escapeHtml(r.phone)}` : ""}\n   ${state}`);

    if (r.is_active && !r.telegram_id) keyboard.text(`✉️ Resend invite: ${r.name}`, `riders:invite:${r.id}`).row();
    keyboard.text(r.is_active ? `🚫 Deactivate ${r.name}` : `✅ Reactivate ${r.name}`, `riders:${r.is_active ? "off" : "on"}:${r.id}`).row();
  }
  keyboard.text("🔄 Refresh", "riders:list");

  const text = lines.join("\n");
  if (edit) await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
  else await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
}
