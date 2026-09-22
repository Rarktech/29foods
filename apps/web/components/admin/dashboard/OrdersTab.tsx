import Link from "next/link";
import type { OrderRawRow } from "./sampleData";

interface LiveOrder extends OrderRawRow {
  open: () => void;
}

export function OrdersTab({
  liveOrders,
  selectedOrder,
  closeOrder,
}: {
  liveOrders: LiveOrder[];
  selectedOrder: OrderRawRow | null;
  closeOrder: () => void;
}) {
  if (selectedOrder) {
    return (
      <div>
        <button onClick={closeOrder} className="mb-4 flex items-center gap-1.5 bg-transparent text-[12.5px] font-bold text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to orders
        </button>
        <div className="grid gap-[18px] lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[17px] font-extrabold text-heading">{selectedOrder.id}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">{selectedOrder.customer} · {selectedOrder.room}</div>
              </div>
              <span className="rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ color: selectedOrder.dotColor, background: selectedOrder.badgeBg }}>
                {selectedOrder.status}
              </span>
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-3.5">
              {selectedOrder.lineItems.map((li) => (
                <div key={li.name} className="flex justify-between text-[12.5px] text-body">
                  <span>{li.name}</span><span>{li.price}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 text-[13.5px] font-extrabold text-heading">
                <span>Total</span><span>{selectedOrder.total}</span>
              </div>
            </div>
            <div className="mt-[18px] flex gap-2.5">
              <button className="flex-1 rounded-[10px] bg-heading py-2.5 text-[12.5px] font-bold text-bg">Mark delivered</button>
              <button className="flex-1 rounded-[10px] border border-border py-2.5 text-[12.5px] font-bold text-body">Reassign rider</button>
              <button className="rounded-[10px] border border-admin-danger-border bg-admin-danger px-3.5 py-2.5 text-[12.5px] font-bold text-admin-nav-active">Log complaint</button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3.5 text-[13.5px] font-bold text-heading">Delivery timeline</h3>
            <div className="flex flex-col gap-3.5">
              {selectedOrder.timeline.map((step) => (
                <div key={step.label} className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: step.color }} />
                  <div>
                    <div className="text-[12.5px] font-bold text-heading">{step.label}</div>
                    <div className="text-[11px] text-muted">{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const delayed = liveOrders.filter((o) => o.status === "DELAYED");

  return (
    <>
      {/* Mobile: card list, matching AdminDashboard.dc.html's Orders tab exactly */}
      <div className="lg:hidden">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Live — {liveOrders.length} in progress</p>
        <div className="mb-5 flex flex-col gap-2.5">
          {liveOrders.map((order) => (
            <button
              key={order.id}
              onClick={order.open}
              className="block w-full rounded-2xl bg-heading p-3.5 text-left dark:border dark:border-border dark:bg-card"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: order.mobileDotColor, boxShadow: `0 0 0 3px ${order.mobileDotRing}` }} />
                  <span className="text-[11px] font-bold tracking-[0.03em]" style={{ color: order.mobileDotColor }}>{order.status}</span>
                </div>
                <span className="text-[11px] font-semibold text-bg/60 dark:text-muted">{order.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-bold text-bg dark:text-heading">{order.customer}</div>
                  <div className="mt-0.5 text-[11px] text-bg/60 dark:text-muted">{order.items}</div>
                </div>
                <span className="text-[13px] font-extrabold text-bg dark:text-heading">{order.total}</span>
              </div>
            </button>
          ))}
        </div>

        {delayed.length > 0 && (
          <>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Needs attention</p>
            <div className="mb-5 flex flex-col gap-2.5">
              {delayed.map((order) => (
                <div key={order.id} className="flex items-center gap-3 rounded-2xl border border-admin-danger-border bg-admin-danger p-3.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--admin-nav-active-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
                  <span className="flex-1 text-[12px] font-semibold text-[#8A1512] dark:text-[#FFB4A8]">Order {order.id} rider delayed 15+ min</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
        <div className="grid grid-cols-[100px_1.6fr_1.4fr_1fr_100px_90px] bg-admin-row-hover px-[18px] py-3 border-b border-border">
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Order</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Customer</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Items</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Status</span>
          <span className="text-right text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Total</span>
          <span />
        </div>
        {liveOrders.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders/${encodeURIComponent(order.id)}`}
            className="grid grid-cols-[100px_1.6fr_1.4fr_1fr_100px_90px] items-center border-b border-admin-row-border px-[18px] py-3.5 transition-colors hover:bg-admin-row-hover"
          >
            <span className="text-[12.5px] font-bold text-body">{order.id}</span>
            <span className="text-[12.5px] font-semibold text-heading">{order.customer}</span>
            <span className="text-[12px] text-muted">{order.items}</span>
            <span className="w-fit rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ color: order.dotColor, background: order.badgeBg }}>
              {order.status}
            </span>
            <span className="text-right text-[12.5px] font-extrabold text-heading">{order.total}</span>
            <span className="text-right text-[11.5px] font-bold text-admin-nav-active">View →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
