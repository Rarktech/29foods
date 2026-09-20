import type { Bot, Context } from "grammy";
import { formatKobo } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { orderActionKeyboard } from "../handlers/new-order";

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID;

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
        const after = payload.new as {
          id: string;
          items: { name: string; qty: number }[];
          lodge: string;
          room: string | null;
          total: number;
        };

        const justPaid = before.payment_status !== "paid" && (payload.new as { payment_status: string }).payment_status === "paid";
        if (!justPaid) return;

        const itemsText = after.items.map((i) => `${i.qty}x ${i.name}`).join(", ");
        const shortId = after.id.slice(0, 8);

        await bot.api.sendMessage(
          ADMIN_CHAT_ID,
          `🔔 New order #${shortId}\n${itemsText}\n${after.lodge}${after.room ? `, ${after.room}` : ""} · ${formatKobo(after.total)} · PAID ✅`,
          { reply_markup: orderActionKeyboard(after.id, "new") },
        );
      },
    )
    .subscribe();
}
