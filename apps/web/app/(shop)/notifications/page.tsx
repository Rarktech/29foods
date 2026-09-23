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

  const [{ data: notifications }, { data: liveOrder }] = await Promise.all([
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
      .not("order_status", "in", "(delivered,cancelled,placed)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let live: LiveOrder | null = null;
  if (liveOrder) {
    // riders and order_status_events are both admin-only RLS (no customer select policy),
    // so both lookups need the service-role client even though the rest of this page reads
    // as the signed-in user.
    const service = getSupabaseServiceClient();

    let riderName: string | null = null;
    if (liveOrder.assigned_rider_id) {
      const { data: rider } = await service.from("riders").select("name").eq("id", liveOrder.assigned_rider_id).maybeSingle();
      riderName = rider?.name ?? null;
    }

    // 'ready'/'out_for_delivery' have no dedicated timestamp column on orders, unlike paid_at/delivered_at.
    const { data: events } = await service
      .from("order_status_events")
      .select("to_status, applied_at, created_at")
      .eq("order_id", liveOrder.id)
      .eq("applied", true)
      .in("to_status", ["ready", "out_for_delivery"])
      .order("created_at", { ascending: true });

    const stageEnteredAt: LiveOrder["stageEnteredAt"] = {
      paid: liveOrder.paid_at ?? liveOrder.created_at,
      delivered: liveOrder.delivered_at,
    };
    for (const e of events ?? []) {
      if (e.to_status === "ready" || e.to_status === "out_for_delivery") {
        stageEnteredAt[e.to_status] = e.applied_at ?? e.created_at;
      }
    }

    const items = liveOrder.items as { name: string; qty: number }[];
    live = {
      orderId: liveOrder.id,
      shortOrderId: `#29F-${liveOrder.id.slice(0, 4).toUpperCase()}`,
      status: liveOrder.order_status,
      dishSummary: items[0]?.name ?? "your order",
      lodge: liveOrder.lodge,
      room: liveOrder.room,
      riderName,
      createdAt: liveOrder.created_at,
      stageEnteredAt,
    };
  }

  return <NotificationCentreView initialNotifications={(notifications ?? []) as NotificationRow[]} initialLive={live} />;
}
