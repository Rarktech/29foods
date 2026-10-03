import { InlineKeyboard, type Bot } from "grammy";
import { isKitchenOpen } from "@29foods/core";
import { getServiceClient } from "./supabase";
import { updateSession } from "./storage";
import { readySince } from "./realtime";
import type { SessionData } from "./session";
import * as copy from "./copy";
import type { MyContext } from "./bot-context";

const SWEEP_EVERY_MS = 60_000;
const ABANDON_AFTER_MS = 15 * 60_000;
const ABANDON_WINDOW_MS = 60 * 60_000; // older than this is a stale cart, not a hesitation
const NO_RIDER_AFTER_MS = 5 * 60_000;

/** Time-based nudges that no user action triggers: abandoned carts, opening-time reminders, rider delays. */
export function startSweeper(bot: Bot<MyContext>) {
  const run = () =>
    Promise.all([nudgeAbandonedCarts(bot), sendOpenReminders(bot), warnNoRider(bot)]).catch((err) => console.error("sweep failed:", err));
  setInterval(run, SWEEP_EVERY_MS);
}

/** One gentle nudge per cart, never a chase. */
async function nudgeAbandonedCarts(bot: Bot<MyContext>) {
  if (!isKitchenOpen()) return;
  const now = Date.now();
  const { data } = await getServiceClient()
    .from("bot_sessions")
    .select("key, value")
    .lt("updated_at", new Date(now - ABANDON_AFTER_MS).toISOString())
    .gt("updated_at", new Date(now - ABANDON_WINDOW_MS).toISOString());

  for (const row of data ?? []) {
    const session = row.value as unknown as SessionData;
    if (!session.cart?.length || session.nudgeSent || session.pendingOrderId) continue;
    await updateSession(row.key, (s) => {
      s.nudgeSent = true;
    });
    await bot.api
      .sendMessage(Number(row.key), copy.abandonedCart(session.cart[0]!.name), {
        reply_markup: new InlineKeyboard().text("✅ Checkout", "cart:checkout").text("🛒 View cart", "cart:view"),
      })
      .catch((err) => console.error("abandon nudge failed:", err));
  }
}

async function sendOpenReminders(bot: Bot<MyContext>) {
  if (!isKitchenOpen()) return;
  const supabase = getServiceClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, telegram_id")
    .eq("open_reminder_requested", true)
    .not("telegram_id", "is", null);
  for (const user of users ?? []) {
    await supabase.from("users").update({ open_reminder_requested: false }).eq("id", user.id);
    await bot.api
      .sendMessage(user.telegram_id!, copy.kitchenOpenReminder, {
        reply_markup: new InlineKeyboard().text("🍚 See today's menu", "menu:home"),
      })
      .catch((err) => console.error("open reminder failed:", err));
  }
}

/** An honest delay beats a missed 30-minute promise with no explanation. */
async function warnNoRider(bot: Bot<MyContext>) {
  const due = [...readySince.entries()].filter(([, v]) => !v.warned && Date.now() - v.at > NO_RIDER_AFTER_MS);
  if (due.length === 0) return;
  const { data: orders } = await getServiceClient()
    .from("orders")
    .select("id, order_status, assigned_rider_id")
    .in("id", due.map(([id]) => id));
  for (const order of orders ?? []) {
    const entry = readySince.get(order.id);
    if (!entry) continue;
    entry.warned = true;
    if (order.order_status === "ready" && !order.assigned_rider_id) {
      await bot.api.sendMessage(entry.chatId, copy.noRiderYet).catch((err) => console.error("no-rider notice failed:", err));
    }
  }
}
