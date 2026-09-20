import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { formatKobo } from "@/lib/format";

export const revalidate = 0;

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-neutral-100 text-neutral-600",
  paid: "bg-blue-100 text-blue-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function AdminOrdersPage() {
  const service = getSupabaseServiceClient();
  const { data: orders } = await service
    .from("orders")
    .select("id, items, total, lodge, room, order_status, payment_status, channel, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">Recent orders</h1>
      <div className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
        {(orders ?? []).map((order) => {
          const items = order.items as { name: string; qty: number }[];
          return (
            <div key={order.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">
                  {items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                </p>
                <p className="text-sm text-neutral-500">
                  {order.lodge}
                  {order.room ? `, ${order.room}` : ""} · {formatKobo(order.total)} · {order.channel}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.order_status] ?? ""}`}>
                {order.order_status.replace(/_/g, " ")}
              </span>
            </div>
          );
        })}
        {(orders ?? []).length === 0 && <p className="p-6 text-center text-neutral-400">No orders yet.</p>}
      </div>
    </div>
  );
}
