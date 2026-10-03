import type { Bot, Context } from "grammy";
import { getServiceClient } from "../supabase";
import { orderActionKeyboard } from "../handlers/new-order";
import { buildOrderCard } from "../order-card";

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID;

// Guards against a Realtime reconnect replaying the same "just paid" event.
const announced = new Set<string>();

/** Pings the admin chat the moment an order is paid — this is the "🔔 New order" flow from the PRD. */
export function subscribeToNewOrders(bot: Bot<Context>) {
  if (!ADMIN_CHAT_ID) throw new Error("Missing required env var: ADMIN_TELEGRAM_CHAT_ID");
  const supabase = getServiceClient();

  supabase
    .channel("bot-admin-new-orders")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders" },
      async (payload) => {
        const before = payload.old as { payment_status?: string };
        const after = payload.new as { id: string; payment_status: string };

        const justPaid = before.payment_status !== "paid" && after.payment_status === "paid";
        if (!justPaid || announced.has(after.id)) return;
        announced.add(after.id);

        try {
          const card = await buildOrderCard(after.id);
          if (!card) return;
          await bot.api.sendMessage(ADMIN_CHAT_ID, card, { parse_mode: "HTML", reply_markup: orderActionKeyboard(after.id, "new") });
        } catch (err) {
          console.error("new order ping failed:", err);
        }
      },
    )
    .subscribe();
}
