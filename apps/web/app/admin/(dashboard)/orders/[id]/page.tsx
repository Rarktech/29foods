import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_DETAILS } from "@/components/admin/dashboard/sampleData";

// Mobile-dark uses a distinct warmer palette in this reference batch; desktop
// and light mode stay on the standard admin tokens (`lg:dark:` resets them).
const CARD = "border border-border dark:border-[#3A2F26] lg:dark:border-border bg-card dark:bg-[#241D17] lg:dark:bg-card";
const HEADING = "text-heading dark:text-[#F5EDE3] lg:dark:text-heading";
const MUTED = "text-muted dark:text-[#8A7D6E] lg:dark:text-muted";
const BODY = "text-body dark:text-[#C9BCAC] lg:dark:text-body";
const ROW_BORDER = "border-admin-row-border dark:border-[#2E271F] lg:dark:border-admin-row-border";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = ORDER_DETAILS[decodeURIComponent(id)];
  if (!order) notFound();

  return (
    <div className="min-h-screen bg-bg dark:bg-[#17120E] lg:dark:bg-bg">
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg px-5 dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-bg lg:px-7">
        <div className="flex items-center gap-2.5 lg:gap-3">
          <Link href="/admin/dashboard?tab=orders" className={`hidden items-center gap-1.5 text-[12.5px] font-bold ${MUTED} lg:flex`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Orders
          </Link>
          <span className="hidden text-[#4A4038] lg:inline">/</span>
          <h1 className={`text-[16px] font-extrabold lg:text-[18px] ${HEADING}`}>{order.id}</h1>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold lg:px-3 lg:py-[5px] lg:text-[11px] ${order.statusClass}`}>{order.status}</span>
      </div>

      <div className="mx-auto max-w-2xl p-5 lg:max-w-none lg:p-7">
        <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr] lg:grid-rows-[auto_auto_auto] lg:items-start lg:gap-[18px]">

          <div className={`rounded-2xl p-4 lg:col-start-1 lg:row-start-1 lg:p-5 ${CARD}`}>
            <h3 className={`mb-3 text-[12.5px] font-bold lg:mb-3.5 lg:text-[13.5px] ${HEADING}`}>Customer &amp; delivery</h3>
            <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3.5">
              <div>
                <p className={`mb-[3px] text-[10px] font-bold uppercase tracking-[0.04em] lg:mb-1 lg:text-[11px] ${MUTED}`}>Customer</p>
                <Link href={`/admin/customers/${order.customerId}`} className="text-[13px] font-bold text-accent lg:text-[13.5px]">{order.customer} →</Link>
              </div>
              <div>
                <p className={`mb-[3px] text-[10px] font-bold uppercase tracking-[0.04em] lg:mb-1 lg:text-[11px] ${MUTED}`}>Phone</p>
                <p className={`text-[12.5px] font-semibold lg:text-[13px] ${HEADING}`}>{order.phone}</p>
              </div>
              <div className="lg:col-span-2">
                <p className={`mb-[3px] text-[10px] font-bold uppercase tracking-[0.04em] lg:mb-1 lg:text-[11px] ${MUTED}`}>Delivery address</p>
                <p className={`text-[12.5px] font-semibold leading-[1.4] lg:text-[13px] ${HEADING}`}>{order.address}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-4 lg:col-start-1 lg:row-start-2 lg:p-5 ${CARD}`}>
            <h3 className={`mb-3 text-[12.5px] font-bold lg:mb-3.5 lg:text-[13.5px] ${HEADING}`}>Items</h3>
            <div className="flex flex-col gap-2 lg:gap-[9px]">
              {order.lineItems.map((li) => (
                <div key={li.name} className={`flex justify-between text-[12px] lg:text-[12.5px] ${BODY}`}>
                  <span>{li.name}</span>
                  <span className="tabular-nums">{li.price}</span>
                </div>
              ))}
            </div>
            <div className={`mt-2.5 flex flex-col gap-1.5 border-t pt-2.5 lg:mt-3 lg:gap-[7px] lg:pt-3 dark:border-[#3A2F26] lg:dark:border-border border-border`}>
              <div className={`flex justify-between text-[12px] lg:text-[12.5px] ${MUTED}`}><span>Subtotal</span><span className="tabular-nums">{order.subtotal}</span></div>
              <div className={`flex justify-between text-[12px] lg:text-[12.5px] ${MUTED}`}><span>Delivery fee</span><span className="tabular-nums">{order.deliveryFee}</span></div>
              <div className={`flex justify-between border-t pt-1.5 text-[13.5px] font-extrabold lg:pt-[7px] lg:text-[14px] dark:border-[#3A2F26] lg:dark:border-border border-border ${HEADING}`}><span>Total</span><span className="tabular-nums">{order.total}</span></div>
            </div>
            <div className={`mt-3 flex items-center gap-[7px] border-t pt-3 lg:mt-3.5 lg:gap-2 lg:pt-3.5 dark:border-[#3A2F26] lg:dark:border-border border-border`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${MUTED}`}><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg>
              <span className={`text-[11.5px] font-semibold lg:text-[12px] ${MUTED}`}>Paid via</span>
              <span className={`text-[11.5px] font-bold lg:text-[12px] ${HEADING}`}>{order.paymentMethod}</span>
            </div>
          </div>

          <div className={`rounded-2xl p-4 lg:col-start-2 lg:row-start-1 lg:p-5 ${CARD}`}>
            <h3 className={`mb-3.5 text-[12.5px] font-bold lg:mb-4 lg:text-[13.5px] ${HEADING}`}>Order timeline</h3>
            <div className="flex flex-col">
              {order.timeline.map((step, i) => (
                <div key={step.label} className="flex items-start gap-2.5 pb-3.5 last:pb-0 lg:gap-3 lg:pb-4">
                  <div className="flex flex-col items-center">
                    <span className={`h-[9px] w-[9px] shrink-0 rounded-full lg:h-2.5 lg:w-2.5 ${step.colorClass}`} />
                    {i < order.timeline.length - 1 && <span className={`mt-1 w-px flex-grow dark:bg-[#3A2F26] lg:dark:bg-border bg-border`} />}
                  </div>
                  <div>
                    <div className={`text-[12px] font-bold lg:text-[12.5px] ${HEADING}`}>{step.label}</div>
                    <div className={`mt-px text-[10.5px] lg:mt-0.5 lg:text-[11px] ${MUTED}`}>{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 lg:col-start-2 lg:row-start-2 lg:p-5 ${CARD}`}>
            <h3 className={`mb-3 text-[12.5px] font-bold lg:mb-3.5 lg:text-[13.5px] ${HEADING}`}>Assigned rider</h3>
            {order.rider ? (
              <div className="flex items-center gap-2.5 lg:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2E1815] text-[13px] font-extrabold text-accent dark:bg-[#2E1815] lg:h-10 lg:w-10 lg:bg-accent-tint lg:text-[14px] lg:dark:bg-accent-tint">{order.rider.initial}</div>
                <div className="flex-grow">
                  <div className={`text-[12.5px] font-bold lg:text-[13px] ${HEADING}`}>{order.rider.name}</div>
                  <div className={`text-[11px] lg:text-[11.5px] ${MUTED}`}>{order.rider.phone}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-[3px] text-[10px] font-bold lg:px-2.5 lg:text-[10.5px] ${order.rider.statusClass}`}>{order.rider.status}</span>
              </div>
            ) : (
              <p className={`text-[12px] lg:text-[12.5px] ${MUTED}`}>No rider assigned yet — order is still in the kitchen.</p>
            )}
          </div>

          <div className={`rounded-2xl p-4 lg:col-start-1 lg:row-start-3 lg:p-5 ${CARD}`}>
            <h3 className={`mb-3 text-[12.5px] font-bold lg:mb-3.5 lg:text-[13.5px] ${HEADING}`}>Other orders from {order.customer}</h3>
            <div className="flex flex-col gap-2 lg:gap-2.5">
              {order.pastOrders.map((po) => (
                <div key={po.id} className={`flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 lg:pb-2.5 ${ROW_BORDER}`}>
                  <div className="min-w-0">
                    <div className={`text-[12px] font-bold lg:text-[12.5px] ${HEADING}`}>{po.id} · {po.items}</div>
                    <div className={`text-[10.5px] ${MUTED}`}>{po.date}</div>
                  </div>
                  <span className={`shrink-0 text-[12px] font-bold lg:text-[12.5px] ${HEADING}`}>{po.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 lg:col-start-2 lg:row-start-3 lg:p-5 ${CARD}`}>
            <h3 className={`mb-3 text-[12.5px] font-bold lg:mb-3.5 lg:text-[13.5px] ${HEADING}`}>Actions</h3>
            <div className="flex flex-col gap-2">
              <button className="rounded-[10px] bg-[#F5EDE3] py-2.5 text-[12.5px] font-bold text-[#17120E] dark:bg-[#F5EDE3] dark:text-[#17120E] lg:bg-heading lg:text-bg lg:dark:bg-heading lg:dark:text-bg">Mark delivered</button>
              <button className={`rounded-[10px] border py-2.5 text-[12.5px] font-bold ${ROW_BORDER} ${BODY}`}>Reassign rider</button>
              <button className="rounded-[10px] border border-[#4A2620] bg-[#2E1815] py-2.5 text-[12.5px] font-bold text-accent dark:border-[#4A2620] dark:bg-[#2E1815] lg:border-admin-danger-border lg:bg-admin-danger lg:dark:border-admin-danger-border lg:dark:bg-admin-danger">Log a complaint</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
