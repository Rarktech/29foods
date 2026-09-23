import { sendOrderProgressPush, type OrderProgressStage } from "@29foods/core/push";
import { getServiceClient } from "./supabase";

/**
 * Web push for order progress — the counterpart to subscribeToOrderUpdates' Telegram
 * messages, for orders placed through the web app instead of the bot. One push per
 * real milestone (order_status reaching paid/ready/out_for_delivery/delivered), using
 * the same 4-stage mapping the in-app OrderStatusTracker/notification centre already
 * use, so a customer's push and their in-app UI never disagree about what stage they're at.
 */
const STATUS_TO_STAGE: Record<string, OrderProgressStage> = {
  paid: "preparing",
  ready: "rider_assigned",
  out_for_delivery: "on_the_way",
  delivered: "delivered",
};

export function subscribeToWebOrderPush() {
  const supabase = getServiceClient();

  supabase
    .channel("bot-customer-web-push")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders", filter: "channel=eq.web" },
      async (payload) => {
        const before = payload.old as { order_status?: string };
        const after = payload.new as {
          id: string;
          user_id: string;
          items: { name: string; qty: number }[];
          lodge: string;
          room: string | null;
          order_status: string;
          assigned_rider_id: string | null;
          created_at: string;
        };

        if (before.order_status === after.order_status) return;
        const stage = STATUS_TO_STAGE[after.order_status];
        if (!stage) return; // 'preparing' itself isn't a distinct push — it's folded into the 'paid' → Preparing push

        let riderName: string | null = null;
        if (after.assigned_rider_id) {
          const { data: rider } = await supabase.from("riders").select("name").eq("id", after.assigned_rider_id).maybeSingle();
          riderName = rider?.name ?? null;
        }

        const minutesElapsed = Math.floor((Date.now() - new Date(after.created_at).getTime()) / 60_000);
        const etaMinutes = Math.max(0, 30 - minutesElapsed);
        const dishSummary = after.items[0]?.name ?? "your order";

        await sendOrderProgressPush(supabase, {
          userId: after.user_id,
          orderId: after.id,
          shortOrderId: `#29F-${after.id.slice(0, 4).toUpperCase()}`,
          stage,
          dishSummary,
          lodge: after.lodge,
          room: after.room,
          etaMinutes,
          riderName,
        }).catch((err) => console.error("web order push failed:", err));
      },
    )
    .subscribe();
}
