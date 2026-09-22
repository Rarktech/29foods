import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { RidersView } from "@/components/admin/RidersView";

export const revalidate = 0;

export default async function AdminRidersPage() {
  const service = getSupabaseServiceClient();

  const [{ data: riders }, { data: deliveredOrders }] = await Promise.all([
    service.from("riders").select("id, name, phone, cycle_status, assigned_bike, created_at").order("created_at"),
    service.from("orders").select("assigned_rider_id").eq("order_status", "delivered").not("assigned_rider_id", "is", null),
  ]);

  const deliveryCounts = new Map<string, number>();
  for (const o of deliveredOrders ?? []) {
    if (!o.assigned_rider_id) continue;
    deliveryCounts.set(o.assigned_rider_id, (deliveryCounts.get(o.assigned_rider_id) ?? 0) + 1);
  }

  const rows = (riders ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    cycleStatus: r.cycle_status,
    assignedBike: r.assigned_bike,
    deliveries: deliveryCounts.get(r.id) ?? 0,
  }));

  return <RidersView riders={rows} />;
}
