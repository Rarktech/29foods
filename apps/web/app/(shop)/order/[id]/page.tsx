import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OrderStatusTracker, type OrderItemSnapshot } from "@/components/OrderStatusTracker";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/order/${id}`);

  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound(); // RLS also hides orders that aren't this user's

  return (
    <OrderStatusTracker
      orderId={order.id}
      initialStatus={order.order_status}
      items={order.items as unknown as OrderItemSnapshot[]}
      total={order.total}
      lodge={order.lodge}
      room={order.room}
      createdAt={order.created_at}
      assignedRiderId={order.assigned_rider_id}
    />
  );
}
