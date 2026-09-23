import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { NotificationCentreView, type NotificationRow, type LiveOrder } from "@/components/NotificationCentreView";

export default async function NotificationsPage() {
  const supabase = await getSupabaseServerClient();
  // getSession() trusts the cookie middleware already validated — this page only reads.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login?next=/notifications");

  const { data: profile } = await supabase.from("users").select("id").eq("auth_uid", user.id).maybeSingle();
  if (!profile) redirect("/login?next=/notifications");

  const [{ data: notifications }, { data: liveOrders }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, title, body, href, thumb_url, read, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("orders")
      .select("id, order_status, items, lodge, room, created_at, paid_at, delivered_at, assigned_rider_id")
      .eq("user_id", profile.id)
      // Still-active orders, plus ones delivered in the last 30 minutes — so the hero
      // card's final "Delivered" state is visible on a normal page load too, not only
      // if you happen to have the page open at the exact moment it lands.
      .or(
        `and(order_status.neq.delivered,order_status.neq.cancelled,order_status.neq.placed),and(order_status.eq.delivered,delivered_at.gte.${new Date(Date.now() - 30 * 60_000).toISOString()})`,
      )
      .order("created_at", { ascending: false }),
  ]);

  let live: LiveOrder[] = [];
  if (liveOrders?.length) {
    // riders and order_status_events are both admin-only RLS (no customer select policy),
    // so both lookups need the service-role client even though the rest of this page reads
    // as the signed-in user. Batched across every live order rather than N+1 queries.
    const service = getSupabaseServiceClient();
    const orderIds = liveOrders.map((o) => o.id);
    const riderIds = [...new Set(liveOrders.map((o) => o.assigned_rider_id).filter((id): id is string => !!id))];

    const [{ data: riders }, { data: events }] = await Promise.all([
      riderIds.length
        ? service.from("riders").select("id, name, phone").in("id", riderIds)
        : Promise.resolve({ data: [] as { id: string; name: string; phone: string | null }[] }),
      service
        .from("order_status_events")
        .select("order_id, to_status, applied_at, created_at")
        .in("order_id", orderIds)
        .eq("applied", true)
        .in("to_status", ["ready", "out_for_delivery"])
        .order("created_at", { ascending: true }),
    ]);

    const riderById = new Map((riders ?? []).map((r) => [r.id, { name: r.name, phone: r.phone }]));

    live = liveOrders.map((order) => {
      const stageEnteredAt: LiveOrder["stageEnteredAt"] = {
        paid: order.paid_at ?? order.created_at,
        delivered: order.delivered_at,
      };
      for (const e of events ?? []) {
        if (e.order_id === order.id && (e.to_status === "ready" || e.to_status === "out_for_delivery")) {
          stageEnteredAt[e.to_status] = e.applied_at ?? e.created_at;
        }
      }

      const items = order.items as { name: string; qty: number }[];
      const rider = order.assigned_rider_id ? riderById.get(order.assigned_rider_id) : null;
      return {
        orderId: order.id,
        shortOrderId: `#29F-${order.id.slice(0, 4).toUpperCase()}`,
        status: order.order_status,
        dishSummary: items[0]?.name ?? "your order",
        lodge: order.lodge,
        room: order.room,
        riderName: rider?.name ?? null,
        riderPhone: rider?.phone ?? null,
        createdAt: order.created_at,
        stageEnteredAt,
      };
    });
  }

  return <NotificationCentreView initialNotifications={(notifications ?? []) as NotificationRow[]} initialLive={live} />;
}
