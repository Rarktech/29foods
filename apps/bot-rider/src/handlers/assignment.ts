import { randomUUID } from "node:crypto";
import type { Bot, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { formatKobo } from "@29foods/core";
import { getServiceClient } from "../supabase";

/**
 * Notifies a rider the moment they're assigned a pickup. A single client_op_id is
 * generated here and baked into both action buttons' callback_data — if the rider's
 * connection drops and Telegram redelivers the same tap, the same op id comes back,
 * so the unique index on order_status_events(order_id, client_op_id) makes it a no-op
 * instead of a duplicate/out-of-order status change.
 */
export function subscribeToAssignments(bot: Bot<Context>) {
  const supabase = getServiceClient();

  supabase
    .channel("bot-rider-assignments")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders" },
      async (payload) => {
        const before = payload.old as { assigned_rider_id?: string | null };
        const after = payload.new as {
          id: string;
          assigned_rider_id: string | null;
          items: { name: string; qty: number }[];
          lodge: string;
          room: string | null;
          payment_status: string;
        };

        const justAssigned = !before.assigned_rider_id && !!after.assigned_rider_id;
        if (!justAssigned) return;

        const { data: rider } = await supabase.from("riders").select("telegram_id").eq("id", after.assigned_rider_id!).maybeSingle();
        if (!rider?.telegram_id) return;

        const { data: user } = await supabase
          .from("orders")
          .select("user_id, users(phone)")
          .eq("id", after.id)
          .single();
        const phone = user && Array.isArray(user.users) ? user.users[0]?.phone : (user?.users as { phone: string | null } | null)?.phone;

        const itemsText = after.items.map((i) => `${i.qty}x ${i.name}`).join(", ");
        const clientOpId = randomUUID();
        const keyboard = new InlineKeyboard().text("📦 Picked up", `rider:pickedup:${after.id}:${clientOpId}`);

        await bot.api.sendMessage(
          rider.telegram_id,
          `🔔 New delivery assigned\n${itemsText}\n📍 ${after.lodge}${after.room ? `, ${after.room}` : ""}\n` +
            `${phone ? `☎️ ${phone} · ` : ""}${after.payment_status === "paid" ? "PAID ✅" : ""}`,
          { reply_markup: keyboard },
        );
      },
    )
    .subscribe();
}
