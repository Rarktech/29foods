import type { Bot, Context } from "grammy";
import { formatKobo } from "@29foods/core";
import { getServiceClient } from "../supabase";

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID;

/**
 * End-of-day summary: orders, revenue, top item, and items currently sold out.
 * Runs inside this same long-running process (see index.ts's node-cron schedule) —
 * simpler than a separate serverless cron since this process already holds the bot token.
 */
export async function sendDailySummary(bot: Bot<Context>) {
  if (!ADMIN_CHAT_ID) return;
  const supabase = getServiceClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("total, items")
    .eq("payment_status", "paid")
    .gte("created_at", startOfDay.toISOString());

  const orderCount = orders?.length ?? 0;
  const revenue = (orders ?? []).reduce((sum, o) => sum + o.total, 0);

  const itemCounts = new Map<string, number>();
  for (const order of orders ?? []) {
    const items = order.items as { name: string; qty: number }[];
    for (const item of items) itemCounts.set(item.name, (itemCounts.get(item.name) ?? 0) + item.qty);
  }
  const topItem = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const { data: soldOut } = await supabase
    .from("inventory")
    .select("stock_count, menu_items(name)")
    .eq("stock_count", 0);
  const soldOutNames = (soldOut ?? []).map((i) => (Array.isArray(i.menu_items) ? i.menu_items[0]?.name : (i.menu_items as { name: string } | null)?.name)).filter(Boolean);

  const lines = [
    `📊 Today: ${orderCount} orders · ${formatKobo(revenue)}`,
    topItem ? `Top: ${topItem[0]} (${topItem[1]})` : null,
    soldOutNames.length > 0 ? `Sold out: ${soldOutNames.join(", ")}` : "Nothing sold out today 🎉",
  ].filter(Boolean);

  await bot.api.sendMessage(ADMIN_CHAT_ID, lines.join("\n"));
}
