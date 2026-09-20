import type { Bot, InlineKeyboard as InlineKeyboardType } from "grammy";
import { InlineKeyboard } from "grammy";
import { formatKobo } from "@29foods/core";
import { getServiceClient } from "./supabase";
import type { MyContext } from "./bot-context";

/**
 * Pushes order-lifecycle updates to the customer without them needing to poll —
 * the "order confirmed" card on payment, and the post-delivery feedback prompt.
 * Mirrors apps/web's Realtime subscription on the same orders table.
 */
export function subscribeToOrderUpdates(bot: Bot<MyContext>) {
  const supabase = getServiceClient();

  supabase
    .channel("bot-customer-orders")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders", filter: "channel=eq.telegram" },
      async (payload) => {
        const before = payload.old as { payment_status?: string; order_status?: string };
        const after = payload.new as {
          id: string;
          user_id: string;
          total: number;
          lodge: string;
          room: string | null;
          payment_status: string;
          order_status: string;
        };

        const justPaid = before.payment_status !== "paid" && after.payment_status === "paid";
        const justDelivered = before.order_status !== "delivered" && after.order_status === "delivered";
        if (!justPaid && !justDelivered) return;

        const { data: user } = await supabase.from("users").select("telegram_id").eq("id", after.user_id).maybeSingle();
        if (!user?.telegram_id) return;

        if (justPaid) {
          await bot.api.sendMessage(
            user.telegram_id,
            `🔥 Order confirmed!\n${after.lodge}${after.room ? `, ${after.room}` : ""} · ${formatKobo(after.total)}\n` +
              `⏱️ Your food arrives in 30 mins or less\nYour order's in the kitchen now 🍳`,
          );
        }

        if (justDelivered) {
          const keyboard: InlineKeyboardType = new InlineKeyboard()
            .text("🔥", `feedback:${after.id}:fire`)
            .text("😐", `feedback:${after.id}:neutral`)
            .text("👎", `feedback:${after.id}:down`);
          await bot.api.sendMessage(user.telegram_id, "Delivered! How was it?", { reply_markup: keyboard });
        }
      },
    )
    .subscribe();
}
