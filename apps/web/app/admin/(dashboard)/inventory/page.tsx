"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { INGREDIENT_BASE } from "@/components/admin/inventory/detailData";

function seededRand(seed: number) {
  let a = seed | 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dateForOffset(offset: number) {
  const d = new Date(2026, 8, 21);
  d.setDate(d.getDate() - offset);
  return d;
}
function isWeekendOffset(offset: number) {
  const day = dateForOffset(offset).getDay();
  return day === 0 || day === 5 || day === 6;
}
function fmtShort(offset: number) {
  const d = dateForOffset(offset);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}
function fmtHeader(offset: number) {
  if (offset === 0) return "Today — " + fmtShort(offset);
  if (offset === 1) return "Yesterday — " + fmtShort(offset);
  return fmtShort(offset);
}
function dayFactor(offset: number, seedBase: number) {
  const rand = seededRand(seedBase + offset * 977);
  let f = 1.0;
  if (isWeekendOffset(offset)) f *= 1.1 + rand() * 0.08;
  else f *= 0.95 + rand() * 0.06;
  f *= 1 + offset * 0.001;
  if (rand() < 0.08) f *= 0.75 + rand() * 0.15;
  return f;
}

const HISTORICAL: Record<number, Record<string, number>> = (() => {
  const data: Record<number, Record<string, number>> = {};
  for (let o = 0; o <= 44; o++) {
    const f = dayFactor(o, 7700);
    const dayRand = seededRand(8800 + o * 151);
    const dayStock: Record<string, number> = {};
    INGREDIENT_BASE.forEach((m) => {
      dayStock[m.id] = Math.max(0, Math.round(m.baseStock * f * (0.9 + dayRand() * 0.2)));
    });
    data[o] = dayStock;
  }
  return data;
})();

export default function AdminInventoryPage() {
  const [offset, setOffset] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  const isToday = offset === 0;
  const isPast = offset > 0;
  const dayStock = isToday ? Object.fromEntries(INGREDIENT_BASE.map((m) => [m.id, m.baseStock])) : HISTORICAL[offset]!;

  const ingredients = INGREDIENT_BASE.map((m) => {
    const stockQty = dayStock[m.id]!;
    const isLow = stockQty < m.reorderLevel;
    return {
      ...m,
      stockLabel: `${stockQty} ${m.unit}`,
      reorderLabel: `${m.reorderLevel} ${m.unit}`,
      isLow,
      stockValue: stockQty * m.unitCost,
      shortName: m.name.split(" (")[0],
    };
  });

  const lowStockCount = ingredients.filter((i) => i.isLow).length;
  const stockValue = ingredients.reduce((n, i) => n + i.stockValue, 0);
  const stockValueLabel = "₦" + stockValue.toLocaleString("en-NG");
  const lowNames = ingredients.filter((i) => i.isLow).map((i) => i.shortName);
  const lowStockNotice =
    lowNames.length > 0
      ? `${lowNames.join(", ")} ${lowNames.length === 1 ? "is" : "are"} running low — reorder before tomorrow's prep.`
      : "All ingredients are above their reorder level.";

  const trendBars = useMemo(() => {
    const offsets: number[] = [];
    for (let o = 29; o >= 0; o--) offsets.push(o);
    const totals = offsets.map((o) => {
      if (o === 0 && isToday) return stockValue;
      const d = HISTORICAL[o]!;
      return INGREDIENT_BASE.reduce((n, m) => n + d[m.id]! * m.unitCost, 0);
    });
    const max = Math.max(...totals, 1);
    return offsets.map((o, i) => ({ height: Math.max(3, Math.round((totals[i]! / max) * 40)) + "px", selected: o === offset }));
  }, [offset, isToday, stockValue]);

  const insightText = useMemo(() => {
    const avgOffsets: number[] = [];
    for (let o = 1; o <= 30; o++) avgOffsets.push(o);
    const avgValue = avgOffsets.reduce((n, o) => n + INGREDIENT_BASE.reduce((nn, m) => nn + HISTORICAL[o]![m.id]! * m.unitCost, 0), 0) / avgOffsets.length;
    const pctVsAvg = avgValue > 0 ? Math.round(((stockValue - avgValue) / avgValue) * 100) : 0;

    const riceOffsets: number[] = [];
    for (let o = 4; o >= 0; o--) riceOffsets.push(o);
    const riceSeries = riceOffsets.map((o) => (o === 0 && isToday ? dayStock["rice"]! : HISTORICAL[o]!["rice"]!));
    let riceDecliningStreak = 1;
    for (let i = riceSeries.length - 1; i > 0; i--) {
      if (riceSeries[i]! < riceSeries[i - 1]!) riceDecliningStreak++;
      else break;
    }

    if (riceDecliningStreak >= 4) return `Rice stock has been trending down for ${riceDecliningStreak} straight days — consider increasing your next restock order.`;
    if (lowStockCount >= 2) return `${lowStockCount} ingredients are below reorder level — restock risk is elevated.`;
    return pctVsAvg >= 0 ? `Stock value is ${pctVsAvg}% above your 30-day average.` : `Stock value is ${Math.abs(pctVsAvg)}% below your 30-day average.`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, isToday, stockValue, lowStockCount]);

  const dateGroups = useMemo(() => {
    const groups = [
      { label: "This week", offsets: [] as number[] },
      { label: "Last week", offsets: [] as number[] },
      { label: "Earlier", offsets: [] as number[] },
    ];
    for (let o = 0; o <= 44; o++) {
      if (o < 7) groups[0]!.offsets.push(o);
      else if (o < 14) groups[1]!.offsets.push(o);
      else groups[2]!.offsets.push(o);
    }
    return groups.map((g) => ({ label: g.label, days: g.offsets.map((o) => ({ offset: o, label: fmtHeader(o), selected: o === offset })) }));
  }, [offset]);

  return (
    <div>
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg px-5 lg:px-7">
        <h1 className="text-[18px] font-extrabold text-heading">Inventory</h1>
        {isToday ? (
          <button onClick={() => setDeliveryModalOpen(true)} className="flex items-center gap-1.5 rounded-full bg-heading px-3.5 py-2 text-[11.5px] font-bold text-bg lg:rounded-[10px] lg:px-4 lg:py-2.5 lg:text-[12.5px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>
            Record delivery
          </button>
        ) : (
          <span className="flex items-center gap-1.5 rounded-[10px] border border-admin-danger-border bg-admin-danger px-3.5 py-2.5 text-[11.5px] font-bold text-[#8A1512] dark:text-[#FFB4A8]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
            Historical view — read only
          </span>
        )}
      </div>

      <div className="mx-auto max-w-3xl p-5 lg:p-7">
        {/* Date nav */}
        <div className="relative mb-3.5 flex items-center justify-center gap-2.5">
          <button onClick={() => setOffset((o) => Math.min(44, o + 1))} aria-label="Previous day" className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-body))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button onClick={() => setDatePickerOpen((v) => !v)} className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-4 py-2 text-[13px] font-bold text-heading">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            {fmtHeader(offset)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <button
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            aria-label="Next day"
            disabled={isToday}
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-border ${isToday ? "bg-admin-row-hover opacity-45" : "bg-card"}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-body))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          {isPast && <button onClick={() => setOffset(0)} className="rounded-full bg-heading px-3.5 py-[7px] text-[11.5px] font-bold text-bg">Today</button>}

          {datePickerOpen && (
            <>
              <div onClick={() => setDatePickerOpen(false)} className="fixed inset-0 z-[39]" />
              <div className="scrollbar-none absolute top-[42px] z-40 w-[260px] max-h-[320px] overflow-y-auto rounded-2xl border border-border bg-card p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
                {dateGroups.map((g) => (
                  <div key={g.label} className="mb-1.5">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-muted">{g.label}</div>
                    {g.days.map((dd) => (
                      <div
                        key={dd.offset}
                        onClick={() => {
                          setOffset(dd.offset);
                          setDatePickerOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg px-2.5 py-2 text-[12.5px] hover:bg-admin-row-hover ${dd.selected ? "bg-accent-tint font-bold text-accent" : "font-semibold text-heading"}`}
                      >
                        {dd.label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Trend strip */}
        <div className="mb-3.5 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[12.5px] font-bold text-heading">Stock value — 30 days</h3>
            <span className="text-[11px] font-bold text-muted">{stockValueLabel} on {fmtShort(offset)}</span>
          </div>
          <div className="flex h-11 items-end gap-[2px]">
            {trendBars.map((bar, i) => (
              <div key={i} className="flex h-full flex-1 items-end">
                <div className={`w-full rounded-t-[2px] ${bar.selected ? "border border-[#8A1512] bg-accent" : "bg-border"}`} style={{ height: bar.height }} />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2.5 rounded-xl2 border border-admin-danger-border bg-admin-danger px-3.5 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>
          <span className="text-[11.5px] font-semibold text-[#8A1512] dark:text-[#FFB4A8]">{insightText}</span>
        </div>

        <div className="mb-[18px] flex gap-2.5">
          <StatCard label="Tracked" value={String(ingredients.length)} className="flex-1" />
          <StatCard label="Low stock" value={String(lowStockCount)} danger className="flex-1" />
          <StatCard label="Value" value={stockValueLabel} className="flex-1" />
        </div>

        {lowStockCount > 0 && (
          <div className="mb-[18px] flex items-center gap-2.5 rounded-xl2 border border-admin-danger-border bg-admin-danger px-3.5 py-3">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
            <span className="text-[11.5px] font-semibold text-[#8A1512] dark:text-[#FFB4A8]">{lowStockNotice}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {ingredients.map((i) => (
            <Link key={i.id} href={`/admin/inventory/${i.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:bg-admin-row-hover">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-heading">{i.name}</div>
                <div className="mt-0.5 text-[11px] text-muted">{i.stockLabel} · reorder at {i.reorderLabel}</div>
                <div className="mt-0.5 text-[10.5px] text-muted">{i.usedIn}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${i.isLow ? "bg-admin-danger text-accent" : "bg-success-bg text-success"}`}>{i.isLow ? "LOW" : "OK"}</span>
            </Link>
          ))}
        </div>
      </div>

      {deliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 lg:items-center" onClick={() => setDeliveryModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-[20px] border border-border bg-card p-6 shadow-[0_-12px_32px_rgba(0,0,0,0.2)] lg:rounded-[20px] lg:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-heading">Record delivery</h3>
              <button onClick={() => setDeliveryModalOpen(false)} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-5 flex flex-col gap-3.5">
              <Field label="Ingredient">
                <select className="w-full border-none bg-transparent text-[13px] text-heading outline-none">
                  {INGREDIENT_BASE.map((m) => <option key={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <div className="flex gap-3">
                <div className="flex-1"><Field label="Quantity received"><input defaultValue="5 bags" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
                <div className="flex-1"><Field label="Cost"><input defaultValue="₦45,000" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><Field label="Supplier"><input defaultValue="Eze Farms Ltd" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
                <div className="flex-1"><Field label="Date"><input defaultValue="Sep 21, 2026" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setDeliveryModalOpen(false)} className="flex-1 rounded-[10px] border border-border bg-bg py-3 text-[13px] font-bold text-body">Cancel</button>
              <button onClick={() => setDeliveryModalOpen(false)} className="flex-1 rounded-[10px] bg-accent py-3 text-[13px] font-bold text-white">Log delivery</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, danger, className }: { label: string; value: string; danger?: boolean; className?: string }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${danger ? "border-admin-danger-border bg-admin-danger" : "border-border bg-card"} ${className ?? ""}`}>
      <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.05em] ${danger ? "text-[#8A1512] dark:text-[#FFB4A8]" : "text-muted"}`}>{label}</p>
      <p className={`text-[15px] font-extrabold tabular-nums lg:text-[19px] ${danger ? "text-accent" : "text-heading"}`}>{value}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</label>
      <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">{children}</div>
    </div>
  );
}
