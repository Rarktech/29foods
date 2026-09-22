import Link from "next/link";
import { formatKobo } from "@/lib/format";
import type { OrderRow } from "./types";

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-bg text-muted",
  paid: "bg-accent-tint text-accent",
  preparing: "bg-warning/15 text-warning",
  ready: "bg-accent-tint text-accent",
  out_for_delivery: "bg-accent-tint text-accent",
  delivered: "bg-success-bg text-success",
  cancelled: "bg-accent-tint text-accent",
};

export function OrdersTab({ orders }: { orders: OrderRow[] }) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-panel border border-border bg-card">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/admin/orders/${order.id}`}
          className="flex items-center justify-between gap-4 p-4 hover:bg-bg"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-heading">{order.itemsSummary}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {order.lodge}
              {order.room ? `, ${order.room}` : ""} · {formatKobo(order.total)} · {order.channel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {order.delayed && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-bold text-white">Delayed</span>
            )}
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${STATUS_STYLES[order.orderStatus] ?? "bg-bg text-muted"}`}>
              {order.orderStatus.replace(/_/g, " ")}
            </span>
          </div>
        </Link>
      ))}
      {orders.length === 0 && <p className="p-6 text-center text-[13px] text-muted">No orders yet.</p>}
    </div>
  );
}
