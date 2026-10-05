// Server-only (imports web-push via @29foods/core/push) — route handlers / server components only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@29foods/supabase-client";
import { sendTelegramMessage } from "@29foods/core";
import { notifyUser } from "@29foods/core/push";

/**
 * Tells the student about their "pay for my plan" link: in-app notification + push (the
 * plan_payment kind always pushes), and a Telegram message too if they use the bot.
 * Best-effort — a failed alert never fails the payment or page load that triggered it.
 */
export async function notifyPlanRequester(
  supabase: SupabaseClient<Database>,
  userId: string,
  message: { title: string; body: string; href: string },
): Promise<void> {
  try {
    await notifyUser(supabase, { userId, kind: "plan_payment", ...message });
    const token = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
    if (!token) return;
    const { data: user } = await supabase.from("users").select("telegram_id").eq("id", userId).maybeSingle();
    if (user?.telegram_id) await sendTelegramMessage(token, user.telegram_id, `${message.title}\n${message.body}`);
  } catch (err) {
    console.error("[plan-pay] requester notification failed", err);
  }
}
