import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OrderStatusTracker } from "@/components/OrderStatusTracker";

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
    <main className="mx-auto max-w-2xl px-4 py-8">
      <OrderStatusTracker orderId={order.id} initialStatus={order.order_status} total={order.total} lodge={order.lodge} room={order.room} />
    </main>
  );
}
