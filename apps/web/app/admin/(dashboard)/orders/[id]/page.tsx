import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { OrderDetailView } from "@/components/admin/OrderDetailView";

export const revalidate = 0;

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = getSupabaseServiceClient();

  const { data: order } = await service.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound();

  const [{ data: customer }, { data: timeline }, { data: rider }, { data: riders }, { data: feedback }] = await Promise.all([
    service.from("users").select("id, name, email, phone, lodge, room, loyalty_points").eq("id", order.user_id).maybeSingle(),
    service
      .from("order_status_events")
      .select("id, from_status, to_status, actor_type, applied, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    order.assigned_rider_id
      ? service.from("riders").select("id, name, phone, cycle_status").eq("id", order.assigned_rider_id).maybeSingle()
      : Promise.resolve({ data: null }),
    service.from("riders").select("id, name, cycle_status").order("name"),
    service.from("feedback").select("id, reaction, comment, reason, status").eq("order_id", id),
  ]);

  const { data: otherOrders } = await service
    .from("orders")
    .select("id, total, order_status, created_at")
    .eq("user_id", order.user_id)
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <OrderDetailView
      order={{
        id: order.id,
        items: order.items as { name: string; qty: number; unit_price: number }[],
        subtotal: order.subtotal,
        deliveryFee: order.delivery_fee,
        total: order.total,
        lodge: order.lodge,
        room: order.room,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        channel: order.channel,
        createdAt: order.created_at,
        deliveredAt: order.delivered_at,
      }}
      customer={
        customer
          ? {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              lodge: customer.lodge,
              room: customer.room,
              loyaltyPoints: customer.loyalty_points,
            }
          : null
      }
      otherOrders={(otherOrders ?? []).map((o) => ({ id: o.id, total: o.total, status: o.order_status, createdAt: o.created_at }))}
      timeline={(timeline ?? []).map((e) => ({
        id: e.id,
        fromStatus: e.from_status,
        toStatus: e.to_status,
        actorType: e.actor_type,
        applied: e.applied,
        createdAt: e.created_at,
      }))}
      rider={rider ? { id: rider.id, name: rider.name, phone: rider.phone, cycleStatus: rider.cycle_status } : null}
      riders={(riders ?? []).map((r) => ({ id: r.id, name: r.name, cycleStatus: r.cycle_status }))}
      hasFeedback={(feedback ?? []).length > 0}
    />
  );
}
