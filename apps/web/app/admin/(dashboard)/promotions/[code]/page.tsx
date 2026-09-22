"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { ORDER_DETAILS } from "@/components/admin/dashboard/sampleData";
import { PROMO_DETAILS } from "@/components/admin/promotions/data";

// Mobile-dark uses a distinct warmer palette in this reference batch; desktop
// and light mode stay on the standard admin tokens (`lg:dark:` resets them).
const CARD = "border border-border dark:border-[#3A2F26] lg:dark:border-border bg-card dark:bg-[#241D17] lg:dark:bg-card";
const HEADING = "text-heading dark:text-[#F5EDE3] lg:dark:text-heading";
const MUTED = "text-muted dark:text-[#8A7D6E] lg:dark:text-muted";
const ROW_BORDER = "border-admin-row-border dark:border-[#2E271F] lg:dark:border-admin-row-border";

export default function PromoDetailPage() {
  const params = useParams<{ code: string }>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const promo = PROMO_DETAILS[params.code];
  if (!promo) notFound();

  const maxVal = Math.max(...promo.rateBars.map((b) => b.value), 1);

  return (
    <div className="min-h-screen bg-bg dark:bg-[#17120E] lg:dark:bg-bg">
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between gap-2.5 border-b border-border bg-bg px-5 dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-bg lg:px-7">
        <div className="flex min-w-0 items-center gap-2.5 lg:gap-3">
          <Link href="/admin/promotions" className={`hidden items-center gap-1.5 text-[12.5px] font-bold ${MUTED} lg:flex`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Promotions
          </Link>
          <span className="hidden text-[#4A4038] lg:inline">/</span>
          <h1 className={`truncate text-[16px] font-extrabold tracking-[0.02em] lg:text-[18px] ${HEADING}`}>{promo.code}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:gap-2.5">
          <span className={`rounded-full px-2.5 py-1 text-[9.5px] font-bold lg:px-3 lg:py-[5px] lg:text-[10.5px] ${promo.statusClass}`}>{promo.status}</span>
          <button
            onClick={() => setEditModalOpen(true)}
            aria-label="Edit promo"
            className={`flex h-[30px] w-[30px] items-center justify-center rounded-full lg:h-auto lg:w-auto lg:gap-1.5 lg:rounded-[10px] lg:px-3.5 lg:py-2 ${CARD}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={HEADING}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
            <span className={`hidden text-[12.5px] font-bold lg:inline ${HEADING}`}>Edit</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-5 lg:max-w-none lg:p-7">
        <div className="mb-3.5 grid grid-cols-2 gap-2.5 lg:mb-5 lg:grid-cols-4 lg:gap-3.5">
          <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-[18px] ${CARD}`}>
            <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-2 lg:text-[11px] ${MUTED}`}>Discount</p>
            <p className="text-[18px] font-extrabold text-accent lg:text-[22px]">{promo.discount}</p>
          </div>
          <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-[18px] ${CARD}`}>
            <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-2 lg:text-[11px] ${MUTED}`}>Uses / Limit</p>
            <p className={`text-[18px] font-extrabold tabular-nums lg:text-[22px] ${HEADING}`}>{promo.uses} / {promo.limit}</p>
          </div>
          <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-[18px] ${CARD}`}>
            <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-2 lg:text-[11px] ${MUTED}`}>Total discount given</p>
            <p className={`text-[18px] font-extrabold tabular-nums lg:text-[22px] ${HEADING}`}>{promo.totalDiscount}</p>
          </div>
          <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-[18px] ${CARD}`}>
            <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-2 lg:text-[11px] ${MUTED}`}>Valid window</p>
            <p className={`text-[13px] font-extrabold lg:text-[15px] ${HEADING}`}>{promo.validWindow}</p>
          </div>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-[1.3fr_1fr]">
          <div className={`rounded-2xl p-4 lg:col-start-2 lg:p-[18px] ${CARD}`}>
            <h3 className={`mb-3.5 text-[13px] font-bold lg:mb-4 lg:text-[14px] ${HEADING}`}>Redemptions, last 6 weeks</h3>
            <div className="flex h-[110px] items-end gap-2.5 lg:h-[130px]">
              {promo.rateBars.map((bar, i) => (
                <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 lg:gap-[7px]">
                  <span className={`text-[9.5px] font-bold tabular-nums lg:text-[10.5px] text-[#C9BCAC] dark:text-[#C9BCAC] lg:dark:text-body`}>{bar.value}</span>
                  <div
                    className={`w-full max-w-[28px] rounded-t-[6px] rounded-b-[3px] ${i === promo.rateBars.length - 1 ? "bg-accent" : "bg-[#4A2620] dark:bg-[#4A2620] lg:bg-admin-chart-bar lg:dark:bg-admin-chart-bar"}`}
                    style={{ height: `${Math.max(4, Math.round((bar.value / maxVal) * 100))}px` }}
                  />
                  <span className={`text-[9.5px] font-semibold lg:text-[10.5px] ${MUTED}`}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`overflow-hidden rounded-2xl lg:col-start-1 lg:row-start-1 ${CARD}`}>
            <div className="border-b p-4 dark:border-[#3A2F26] lg:dark:border-border lg:p-5 border-border">
              <h3 className={`text-[13px] font-bold lg:text-[14px] ${HEADING}`}>Recent redemptions</h3>
            </div>
            {promo.redemptions.length > 0 ? (
              <>
                <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr] border-b border-border bg-admin-row-hover px-5 py-3 lg:grid">
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Customer</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Order</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Date</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Discount</span>
                </div>
                <div className="flex flex-col gap-0 p-4 lg:hidden">
                  {promo.redemptions.map((r) => {
                    const hasDetail = !!ORDER_DETAILS[r.orderId];
                    const rowClass = `flex items-center justify-between gap-2.5 border-b pb-2.5 pt-2.5 first:pt-0 last:border-0 last:pb-0 ${ROW_BORDER}`;
                    const rowContent = (
                      <>
                        <div className="min-w-0">
                          <div className={`text-[12px] font-bold ${HEADING}`}>{r.customer}</div>
                          <div className={`mt-px text-[10.5px] ${MUTED}`}>{r.orderId} · {r.date}</div>
                        </div>
                        <span className="shrink-0 text-[12.5px] font-bold text-accent">{r.discountApplied}</span>
                      </>
                    );
                    return hasDetail ? (
                      <Link key={r.orderId} href={`/admin/orders/${encodeURIComponent(r.orderId)}`} className={rowClass}>{rowContent}</Link>
                    ) : (
                      <div key={r.orderId} className={rowClass}>{rowContent}</div>
                    );
                  })}
                </div>
                <div className="hidden lg:block">
                  {promo.redemptions.map((r) => {
                    const hasDetail = !!ORDER_DETAILS[r.orderId];
                    const rowClass = "grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center border-b border-admin-row-border px-5 py-3 transition-colors hover:bg-admin-row-hover";
                    const rowContent = (
                      <>
                        <span className="text-[12.5px] font-bold text-heading">{r.customer}</span>
                        <span className="text-[12px] text-body">{r.orderId}</span>
                        <span className="text-[11.5px] text-muted">{r.date}</span>
                        <span className="text-[12.5px] font-bold text-accent">{r.discountApplied}</span>
                      </>
                    );
                    return hasDetail ? (
                      <Link key={r.orderId} href={`/admin/orders/${encodeURIComponent(r.orderId)}`} className={rowClass}>{rowContent}</Link>
                    ) : (
                      <div key={r.orderId} className={rowClass}>{rowContent}</div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className={`p-5 text-[12.5px] ${MUTED}`}>No redemptions yet — this code hasn&rsquo;t started.</p>
            )}
          </div>
        </div>
      </div>

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 lg:items-center" onClick={() => setEditModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-[440px] rounded-t-[20px] p-6 shadow-[0_-12px_32px_rgba(0,0,0,0.2)] lg:rounded-[20px] lg:shadow-[0_20px_60px_rgba(0,0,0,0.25)] ${CARD}`}>
            <div className="mb-[18px] flex items-center justify-between">
              <h3 className={`text-[16px] font-extrabold ${HEADING}`}>Edit promo code</h3>
              <button onClick={() => setEditModalOpen(false)} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg dark:bg-[#17120E] lg:dark:bg-bg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={MUTED}><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-5 flex flex-col gap-3.5">
              <Field label="Code" muted={MUTED}><input defaultValue={promo.code} className={`w-full border-none bg-transparent text-[13px] font-bold tracking-[0.02em] outline-none ${HEADING}`} /></Field>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] ${MUTED}`}>Discount type</label>
                  <div className="flex rounded-[10px] border border-border bg-bg p-[3px] dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-bg">
                    <button className={`flex-1 rounded-[8px] py-1.5 text-[12px] font-bold ${promo.discount.includes("%") ? "bg-[#F5EDE3] text-[#17120E] dark:bg-[#F5EDE3] dark:text-[#17120E] lg:bg-heading lg:text-bg lg:dark:bg-heading lg:dark:text-bg" : MUTED}`}>% off</button>
                    <button className={`flex-1 rounded-[8px] py-1.5 text-[12px] font-bold ${!promo.discount.includes("%") ? "bg-[#F5EDE3] text-[#17120E] dark:bg-[#F5EDE3] dark:text-[#17120E] lg:bg-heading lg:text-bg lg:dark:bg-heading lg:dark:text-bg" : MUTED}`}>₦ off</button>
                  </div>
                </div>
                <div className="flex-1"><Field label="Value" muted={MUTED}><input defaultValue={promo.discount.replace(/[^0-9]/g, "")} className={`w-full border-none bg-transparent text-[13px] outline-none ${HEADING}`} /></Field></div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><Field label="Usage limit" muted={MUTED}><input type="number" defaultValue={promo.limit} className={`w-full border-none bg-transparent text-[13px] outline-none ${HEADING}`} /></Field></div>
                <div className="flex-1"><Field label="Expiry date" muted={MUTED}><input defaultValue={promo.validWindow} className={`w-full border-none bg-transparent text-[13px] outline-none ${HEADING}`} /></Field></div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setEditModalOpen(false)} className={`px-3.5 py-2.5 text-[12.5px] font-bold ${MUTED}`}>Cancel</button>
              <button onClick={() => setEditModalOpen(false)} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, muted }: { label: string; children: React.ReactNode; muted: string }) {
  return (
    <div>
      <label className={`mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] ${muted}`}>{label}</label>
      <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5 dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-admin-input">{children}</div>
    </div>
  );
}
