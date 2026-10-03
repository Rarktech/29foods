import { Bot, type Context } from "grammy";
import { getServiceClient } from "../supabase";
import { escapeHtml } from "../order-card";

/** Start of today in WAT (UTC+1, no DST), as an ISO timestamp. */
function startOfTodayWat(): string {
  const shifted = new Date(Date.now() + 60 * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 60 * 60 * 1000).toISOString();
}

function watTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * /spins — today's Spin & Win prizes: who won what, and whether it's still waiting to be
 * used, already applied to an order, or expired. "Another go" spins are left out.
 */
export function registerSpinHandlers(bot: Bot<Context>) {
  bot.command("spins", async (ctx) => {
    const supabase = getServiceClient();
    const { data: wins } = await supabase
      .from("spin_wins")
      .select("user_id, prize_label, won_at, expires_at, redeemed, redeemed_order_id")
      .eq("is_try_again", false)
      .gte("won_at", startOfTodayWat())
      .order("won_at", { ascending: false })
      .limit(40);

    if (!wins || wins.length === 0) {
      await ctx.reply("No spin prizes won yet today.");
      return;
    }

    const { data: users } = await supabase
      .from("users")
      .select("id, name")
      .in("id", [...new Set(wins.map((w) => w.user_id))]);
    const nameOf = new Map((users ?? []).map((u) => [u.id, u.name?.trim() || "Customer"]));

    const now = Date.now();
    const lines = wins.map((w) => {
      const status = w.redeemed
        ? `✅ used on #${w.redeemed_order_id?.slice(0, 8) ?? "?"}`
        : w.expires_at && new Date(w.expires_at).getTime() < now
          ? "⌛ expired unused"
          : `⏳ unused, valid till ${w.expires_at ? watTime(w.expires_at) : "?"}`;
      return `• <b>${escapeHtml(nameOf.get(w.user_id) ?? "Customer")}</b>: ${escapeHtml(w.prize_label)} (${watTime(w.won_at)})\n   ${status}`;
    });
    const used = wins.filter((w) => w.redeemed).length;
    await ctx.reply(`🎡 <b>Spin prizes today</b>: ${wins.length} won, ${used} used\n\n${lines.join("\n")}`, { parse_mode: "HTML" });
  });
}
