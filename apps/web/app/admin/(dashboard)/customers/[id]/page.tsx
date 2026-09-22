import Link from "next/link";
import { notFound } from "next/navigation";
import { CUSTOMER_DETAILS, ORDER_DETAILS } from "@/components/admin/dashboard/sampleData";

// Mobile-dark uses a distinct warmer palette in this reference batch; desktop
// and light mode stay on the standard admin tokens (`lg:dark:` resets them).
const CARD = "border border-border dark:border-[#3A2F26] lg:dark:border-border bg-card dark:bg-[#241D17] lg:dark:bg-card";
const HEADING = "text-heading dark:text-[#F5EDE3] lg:dark:text-heading";
const MUTED = "text-muted dark:text-[#8A7D6E] lg:dark:text-muted";
const ROW_BORDER = "border-admin-row-border dark:border-[#2E271F] lg:dark:border-admin-row-border";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = CUSTOMER_DETAILS[id];
  if (!customer) notFound();

  return (
    <div className="min-h-screen bg-bg dark:bg-[#17120E] lg:dark:bg-bg">
      <div className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-bg px-5 dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-bg lg:px-7">
        <Link href="/admin/dashboard?tab=customers" className={`hidden items-center gap-1.5 text-[12.5px] font-bold ${MUTED} lg:flex`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Customers
        </Link>
        <span className="hidden text-[#4A4038] lg:inline">/</span>
        <h1 className={`text-[17px] font-extrabold lg:text-[18px] ${HEADING}`}>{customer.name}</h1>
      </div>

      <div className="p-5 lg:p-7">
        <div className="grid gap-3.5 lg:grid-cols-[1fr_1.8fr] lg:items-start lg:gap-[18px]">

          {/* LEFT: profile */}
          <div className="flex flex-col gap-3.5 lg:gap-3.5">
            <div className={`rounded-2xl p-5 text-center lg:p-[22px] ${CARD}`}>
              <div className="mx-auto mb-2.5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent-tint text-[19px] font-extrabold text-admin-nav-active lg:h-[60px] lg:w-[60px] lg:text-[21px]">
                {customer.initial}
              </div>
              <div className={`mb-1 text-[15.5px] font-extrabold lg:text-[17px] ${HEADING}`}>{customer.name}</div>
              <div className={`mb-2.5 text-[11.5px] lg:text-[12px] ${MUTED}`}>{customer.phone}</div>
              <span className={`rounded-full px-[11px] py-1 text-[10px] font-bold lg:px-3 lg:text-[10.5px] ${customer.tagClass}`}>{customer.tag}</span>

              <div className={`mt-4 flex flex-col gap-2 border-t pt-3.5 text-left dark:border-[#3A2F26] lg:dark:border-border border-border`}>
                <div className="flex justify-between text-[12px] lg:text-[12.5px]">
                  <span className={MUTED}>Hostel / lodge</span>
                  <span className={`text-right font-bold ${HEADING}`}>{customer.address}</span>
                </div>
                <div className="flex justify-between text-[12px] lg:text-[12.5px]">
                  <span className={MUTED}>Joined</span>
                  <span className={`font-bold ${HEADING}`}>{customer.joinDate}</span>
                </div>
                <div className="flex justify-between text-[12px] lg:text-[12.5px]">
                  <span className={MUTED}>Meal plan</span>
                  <span className={`font-bold ${customer.planActive ? "text-success dark:text-[#6FCB93] lg:dark:text-success" : HEADING}`}>{customer.plan}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-4 ${CARD}`}>
                <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-[7px] lg:text-[10.5px] ${MUTED}`}>Lifetime orders</p>
                <p className={`text-[18px] font-extrabold tabular-nums lg:text-[21px] ${HEADING}`}>{customer.orderCount}</p>
              </div>
              <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-4 ${CARD}`}>
                <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-[7px] lg:text-[10.5px] ${MUTED}`}>Avg order value</p>
                <p className={`text-[18px] font-extrabold tabular-nums lg:text-[21px] ${HEADING}`}>{customer.avgOrder}</p>
              </div>
              <div className={`col-span-2 rounded-[14px] p-3.5 lg:rounded-2xl lg:p-4 ${CARD}`}>
                <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-[7px] lg:text-[10.5px] ${MUTED}`}>Lifetime spend</p>
                <p className="text-[21px] font-extrabold tabular-nums text-success dark:text-[#6FCB93] lg:text-[24px] lg:dark:text-success">{customer.lifetimeSpend}</p>
              </div>
            </div>

            {customer.feedback.length > 0 && (
              <div className={`rounded-2xl p-4 lg:p-[18px] ${CARD}`}>
                <h3 className={`mb-2.5 text-[12.5px] font-bold lg:mb-3.5 lg:text-[13px] ${HEADING}`}>Complaints resolved for this customer</h3>
                <div className="flex flex-col gap-2.5">
                  {customer.feedback.map((f, i) => (
                    <div key={i} className={`border-b pb-2.5 last:border-0 last:pb-0 ${ROW_BORDER}`}>
                      <div className="mb-[3px] flex items-start justify-between gap-2">
                        <span className={`text-[11.5px] font-bold lg:text-[12px] ${HEADING}`}>{f.orderId} · {f.dish}</span>
                        <span className={`shrink-0 rounded-full px-[7px] py-0.5 text-[9.5px] font-bold lg:px-2 lg:text-[10.5px] ${f.statusClass}`}>{f.status}</span>
                      </div>
                      <div className={`text-[11px] lg:text-[11.5px] ${MUTED}`}>{f.reason} · {f.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: order history */}
          <div className={`overflow-hidden rounded-2xl ${CARD}`}>
            <div className="border-b border-border p-4 dark:border-[#3A2F26] lg:dark:border-border lg:p-5 lg:px-5">
              <h3 className={`text-[12.5px] font-bold lg:text-[14px] ${HEADING}`}>Order history</h3>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-[90px_1fr_1.6fr_1fr_1fr] border-b border-border bg-admin-row-hover px-5 py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Order</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Date</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Dish(es)</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Amount</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Status</span>
              </div>
              {customer.history.map((h) => {
                const rowClass = "grid grid-cols-[90px_1fr_1.6fr_1fr_1fr] items-center border-b border-admin-row-border px-5 py-3 transition-colors hover:bg-admin-row-hover";
                const rowContent = (
                  <>
                    <span className="text-[12px] font-bold text-body">{h.id}</span>
                    <span className="text-[11.5px] text-muted">{h.date}</span>
                    <span className="text-[12px] text-body">{h.dish}</span>
                    <span className="text-[12.5px] font-bold text-heading">{h.amount}</span>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[10.5px] font-bold ${h.statusClass}`}>{h.status}</span>
                  </>
                );
                return ORDER_DETAILS[h.id] ? (
                  <Link key={h.id + h.date} href={`/admin/orders/${encodeURIComponent(h.id)}`} className={rowClass}>{rowContent}</Link>
                ) : (
                  <div key={h.id + h.date} className={rowClass}>{rowContent}</div>
                );
              })}
            </div>

            {/* Mobile list */}
            <div className="flex flex-col gap-2.5 p-4 lg:hidden">
              {customer.history.map((h) => {
                const rowClass = `flex items-center justify-between gap-2.5 border-b pb-2.5 last:border-0 last:pb-0 ${ROW_BORDER}`;
                const rowContent = (
                  <>
                    <div className="min-w-0">
                      <div className={`text-[11.5px] font-bold ${HEADING}`}>{h.id}</div>
                      <div className="mt-px text-[11px] text-[#C9BCAC] dark:text-[#C9BCAC] lg:dark:text-body">{h.dish}</div>
                      <div className={`mt-px text-[10px] ${MUTED}`}>{h.date}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`text-[12px] font-bold ${HEADING}`}>{h.amount}</span>
                      <span className={`rounded-full px-[7px] py-0.5 text-[9px] font-bold ${h.statusClass}`}>{h.status}</span>
                    </div>
                  </>
                );
                return ORDER_DETAILS[h.id] ? (
                  <Link key={h.id + h.date} href={`/admin/orders/${encodeURIComponent(h.id)}`} className={rowClass}>{rowContent}</Link>
                ) : (
                  <div key={h.id + h.date} className={rowClass}>{rowContent}</div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
