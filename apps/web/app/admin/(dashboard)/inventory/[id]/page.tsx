"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { INGREDIENT_BASE, INGREDIENT_DETAILS } from "@/components/admin/inventory/detailData";

// Mobile-dark uses a distinct warmer palette in this reference batch; desktop
// and light mode stay on the standard admin tokens (`lg:dark:` resets them).
const CARD = "border border-border dark:border-[#3A2F26] lg:dark:border-border bg-card dark:bg-[#241D17] lg:dark:bg-card";
const HEADING = "text-heading dark:text-[#F5EDE3] lg:dark:text-heading";
const MUTED = "text-muted dark:text-[#8A7D6E] lg:dark:text-muted";
const ROW_BORDER = "border-admin-row-border dark:border-[#2E271F] lg:dark:border-admin-row-border";

export default function IngredientDetailPage() {
  const params = useParams<{ id: string }>();
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const base = INGREDIENT_BASE.find((m) => m.id === params.id);
  const detail = base ? INGREDIENT_DETAILS[base.id] : undefined;
  if (!base || !detail) notFound();

  const isLow = base.baseStock < base.reorderLevel;
  const weekTotalVal = detail.usageRaw.reduce((n, d) => n + d.value, 0);
  const fmtQty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1)) + " " + detail.unit;
  const maxVal = Math.max(...detail.usageRaw.map((d) => d.value), 1);
  const daysToStockoutLabel = detail.daysToStockoutLabel ?? `~${detail.avgDailyUse > 0 ? Math.max(0, Math.round((base.baseStock / detail.avgDailyUse) * 10) / 10) : 0} days`;

  return (
    <div className="min-h-screen bg-bg dark:bg-[#17120E] lg:dark:bg-bg">
      <div className="sticky top-0 z-10 flex h-16 items-center gap-2.5 border-b border-border bg-bg px-5 dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-bg lg:px-7">
        <Link href="/admin/inventory" className={`hidden items-center gap-1.5 text-[12.5px] font-bold ${MUTED} lg:flex`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Inventory
        </Link>
        <span className="hidden text-[#4A4038] lg:inline">/</span>
        <h1 className={`flex-1 text-[15px] font-extrabold lg:text-[18px] ${HEADING}`}>{base.name}</h1>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold lg:px-3 lg:text-[10.5px] ${isLow ? "text-accent bg-accent-tint" : "text-success bg-success-bg"}`}>
          {isLow ? "LOW" : "OK"}
        </span>
      </div>

      <div className="mx-auto max-w-2xl p-5 lg:max-w-none lg:p-7">
        <div className="mb-3.5 grid grid-cols-2 gap-2.5 lg:mb-5 lg:grid-cols-4 lg:gap-3.5">
          <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-[18px] ${CARD}`}>
            <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-[9px] lg:text-[11px] ${MUTED}`}>Current stock</p>
            <p className="text-[18px] font-extrabold tabular-nums text-accent lg:text-[22px]">{fmtQty(base.baseStock)}</p>
          </div>
          <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-[18px] ${CARD}`}>
            <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-[9px] lg:text-[11px] ${MUTED}`}>Reorder level</p>
            <p className={`text-[18px] font-extrabold tabular-nums lg:text-[22px] ${HEADING}`}>{fmtQty(base.reorderLevel)}</p>
          </div>
          <div className={`rounded-[14px] p-3.5 lg:rounded-2xl lg:p-[18px] ${CARD}`}>
            <p className={`mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-[9px] lg:text-[11px] ${MUTED}`}>Avg daily use</p>
            <p className={`text-[18px] font-extrabold tabular-nums lg:text-[22px] ${HEADING}`}>{fmtQty(detail.avgDailyUse)}/day</p>
          </div>
          <div className="rounded-[14px] border border-[#4A2620] bg-[#2E1815] p-3.5 dark:border-[#4A2620] dark:bg-[#2E1815] lg:rounded-2xl lg:border-admin-danger-border lg:bg-admin-danger lg:p-[18px] lg:dark:border-admin-danger-border lg:dark:bg-admin-danger">
            <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#E8998F] dark:text-[#E8998F] lg:mb-[9px] lg:text-[11px] lg:text-accent lg:dark:text-accent">Days to stockout</p>
            <p className="text-[18px] font-extrabold tabular-nums text-accent lg:text-[22px]">{daysToStockoutLabel}</p>
          </div>
        </div>

        <div className="mb-3.5 flex flex-col gap-3.5 lg:mb-3.5 lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-3.5">
          <div className={`rounded-2xl p-4 lg:p-[18px] ${CARD}`}>
            <div className="mb-3.5 flex items-center justify-between lg:mb-4">
              <h3 className={`text-[13px] font-bold lg:text-[14px] ${HEADING}`}>Usage, last 7 days</h3>
              <span className={`text-[10.5px] font-bold lg:text-[11.5px] ${MUTED}`}>{fmtQty(weekTotalVal)} used</span>
            </div>
            <div className="flex h-[110px] items-end gap-2 lg:h-[130px] lg:gap-3.5">
              {detail.usageRaw.map((bar, i) => (
                <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 lg:gap-[7px]">
                  <span className="text-[9px] font-bold tabular-nums text-[#C9BCAC] dark:text-[#C9BCAC] lg:text-[11px] lg:dark:text-body">{fmtQty(bar.value)}</span>
                  <div
                    className={`w-full max-w-[26px] rounded-t-[6px] rounded-b-[3px] lg:max-w-[34px] lg:rounded-t-[7px] ${i === detail.usageRaw.length - 1 ? "bg-accent" : "bg-[#4A2620] dark:bg-[#4A2620] lg:bg-admin-chart-bar lg:dark:bg-admin-chart-bar"}`}
                    style={{ height: `${Math.max(4, Math.round((bar.value / maxVal) * 100))}px` }}
                  />
                  <span className={`text-[9.5px] font-semibold lg:text-[11px] ${MUTED}`}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 lg:p-[18px] ${CARD}`}>
            <h3 className={`mb-3 text-[13px] font-bold lg:mb-3.5 lg:text-[14px] ${HEADING}`}>Supplier</h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between text-[12px] lg:text-[12.5px]"><span className={MUTED}>Supplier</span><span className={`font-bold ${HEADING}`}>{detail.supplier}</span></div>
              <div className="flex justify-between text-[12px] lg:text-[12.5px]"><span className={MUTED}>Last restock</span><span className={`font-bold ${HEADING}`}>{detail.lastRestockDate}</span></div>
              <div className="flex justify-between text-[12px] lg:text-[12.5px]"><span className={MUTED}>Last restock cost</span><span className={`font-bold ${HEADING}`}>{detail.lastRestockCost}</span></div>
              <div className="flex justify-between text-[12px] lg:text-[12.5px]"><span className={MUTED}>Restock qty</span><span className={`font-bold ${HEADING}`}>{detail.lastRestockQty}</span></div>
            </div>
            <button
              onClick={() => setDeliveryModalOpen(true)}
              className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#F5EDE3] py-2.5 text-[12.5px] font-bold text-[#17120E] dark:bg-[#F5EDE3] dark:text-[#17120E] lg:mt-4 lg:bg-heading lg:py-2.5 lg:text-bg lg:dark:bg-heading lg:dark:text-bg"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>
              Record delivery
            </button>
          </div>
        </div>

        {/* Mobile: card list */}
        <div className={`rounded-2xl p-4 lg:hidden ${CARD}`}>
          <h3 className={`mb-3 text-[13px] font-bold ${HEADING}`}>Used in these dishes</h3>
          <div className="flex flex-col gap-2.5">
            {detail.usedInDishes.map((d) => (
              <div key={d.name} className={`flex items-center justify-between gap-2 border-b pb-2.5 last:border-0 last:pb-0 ${ROW_BORDER}`}>
                <div className="min-w-0">
                  <div className={`text-[12.5px] font-bold ${HEADING}`}>{d.name}</div>
                  <div className={`mt-px text-[10.5px] ${MUTED}`}>{d.rate}</div>
                </div>
                <span className={`shrink-0 text-[12px] font-bold tabular-nums ${HEADING}`}>{d.orders} orders</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-[14px] font-bold text-heading">Used in these dishes</h3>
          </div>
          <div className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-border bg-admin-row-hover px-5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Dish</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Usage rate</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Orders this week</span>
          </div>
          {detail.usedInDishes.map((d) => (
            <div key={d.name} className="grid grid-cols-[1.6fr_1fr_1fr] items-center border-b border-admin-row-border px-5 py-3 transition-colors hover:bg-admin-row-hover">
              <span className="text-[13px] font-bold text-heading">{d.name}</span>
              <span className="text-[12px] text-body">{d.rate}</span>
              <span className="text-[12.5px] font-bold tabular-nums text-heading">{d.orders}</span>
            </div>
          ))}
        </div>
      </div>

      {deliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 lg:items-center" onClick={() => setDeliveryModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[480px] rounded-t-[20px] p-6 shadow-[0_-12px_32px_rgba(0,0,0,0.2)] lg:rounded-[20px] lg:shadow-[0_20px_60px_rgba(0,0,0,0.25)] ${CARD}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-[16px] font-extrabold ${HEADING}`}>Record delivery</h3>
              <button onClick={() => setDeliveryModalOpen(false)} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg dark:bg-[#17120E] lg:dark:bg-bg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={MUTED}><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-5 flex flex-col gap-3.5">
              <Field label="Ingredient" heading={HEADING} muted={MUTED}>
                <select className={`w-full border-none bg-transparent text-[13px] outline-none ${HEADING}`}>
                  {INGREDIENT_BASE.map((m) => <option key={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <div className="flex gap-3">
                <div className="flex-1"><Field label="Quantity received" heading={HEADING} muted={MUTED}><input defaultValue={detail.lastRestockQty} className={`w-full border-none bg-transparent text-[13px] outline-none ${HEADING}`} /></Field></div>
                <div className="flex-1"><Field label="Cost" heading={HEADING} muted={MUTED}><input defaultValue={detail.lastRestockCost} className={`w-full border-none bg-transparent text-[13px] outline-none ${HEADING}`} /></Field></div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><Field label="Supplier" heading={HEADING} muted={MUTED}><input defaultValue={detail.supplier} className={`w-full border-none bg-transparent text-[13px] outline-none ${HEADING}`} /></Field></div>
                <div className="flex-1"><Field label="Date" heading={HEADING} muted={MUTED}><input defaultValue="Sep 21, 2026" className={`w-full border-none bg-transparent text-[13px] outline-none ${HEADING}`} /></Field></div>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setDeliveryModalOpen(false)} className={`flex-1 rounded-[10px] border py-3 text-[13px] font-bold ${ROW_BORDER} ${MUTED}`}>Cancel</button>
              <button onClick={() => setDeliveryModalOpen(false)} className="flex-1 rounded-[10px] bg-accent py-3 text-[13px] font-bold text-white">Log delivery</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, muted }: { label: string; children: React.ReactNode; heading: string; muted: string }) {
  return (
    <div>
      <label className={`mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] ${muted}`}>{label}</label>
      <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5 dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-admin-input">
        {children}
      </div>
    </div>
  );
}
