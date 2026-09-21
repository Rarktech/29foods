import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OrdersView, type OrderSummary, type SubscriptionSummary } from "@/components/OrdersView";
import type { OrderItemSnapshot } from "@/components/OrderStatusTracker";

const ACTIVE_STATUSES = ["placed", "paid", "preparing", "ready", "out_for_delivery"];

export default async function OrdersPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, items, total, order_status, created_at, subscription_id")
    .order("created_at", { ascending: false })
    .limit(30);

  const active: OrderSummary[] = [];
  const history: OrderSummary[] = [];
  for (const order of orders ?? []) {
    const summary: OrderSummary = {
      id: order.id,
      items: order.items as unknown as OrderItemSnapshot[],
      total: order.total,
      status: order.order_status,
      createdAt: order.created_at,
      isSubscriptionDelivery: !!order.subscription_id,
    };
    if (ACTIVE_STATUSES.includes(order.order_status)) active.push(summary);
    else if (order.order_status === "delivered") history.push(summary);
  }

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, duration_id, status, start_date, end_date, deliveries_total, deliveries_used, total_paid")
    .order("created_at", { ascending: false });

  const subscriptionSummaries: SubscriptionSummary[] = (subscriptions ?? []).map((s) => ({
    id: s.id,
    durationId: s.duration_id,
    status: s.status,
    startDate: s.start_date,
    endDate: s.end_date,
    deliveriesTotal: s.deliveries_total,
    deliveriesUsed: s.deliveries_used,
    totalPaid: s.total_paid,
  }));

  return <OrdersView active={active} history={history} subscriptions={subscriptionSummaries} />;
}
