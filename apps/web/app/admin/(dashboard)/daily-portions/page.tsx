"use client";

import { useMemo, useState } from "react";

interface DishBase {
  id: string;
  name: string;
  base: number;
}

const DISH_BASE: DishBase[] = [
  { id: "jollof", name: "Party Jollof", base: 60 },
  { id: "native", name: "Native Jollof", base: 45 },
  { id: "ofada", name: "Ofada Special", base: 40 },
  { id: "garlic", name: "Garlic Fried Rice", base: 30 },
  { id: "chicken", name: "Grilled Chicken", base: 70 },
  { id: "peppered", name: "Peppered Chicken", base: 50 },
  { id: "assortedMeat", name: "Assorted Meat Dish", base: 25 },
  { id: "poundedYamEgusi", name: "Pounded Yam & Egusi", base: 20 },
  { id: "semoOgbono", name: "Semo & Ogbono", base: 20 },
];

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
  if (isWeekendOffset(offset)) f *= 1.18 + rand() * 0.1;
  else f *= 0.92 + rand() * 0.08;
  f *= 1 - offset * 0.0025;
  if (rand() < 0.08) f *= 0.6 + rand() * 0.15;
  return f;
}

type Portions = Record<string, { cooked: number; sold: number }>;

const INITIAL_PORTIONS: Portions = {
  jollof: { cooked: 60, sold: 38 },
  native: { cooked: 45, sold: 41 },
  ofada: { cooked: 40, sold: 40 },
  garlic: { cooked: 30, sold: 12 },
  chicken: { cooked: 70, sold: 30 },
  peppered: { cooked: 50, sold: 50 },
  assortedMeat: { cooked: 25, sold: 9 },
  poundedYamEgusi: { cooked: 20, sold: 6 },
  semoOgbono: { cooked: 20, sold: 19 },
};

const HISTORICAL: Record<number, Portions> = (() => {
  const data: Record<number, Portions> = {};
  for (let o = 0; o <= 44; o++) {
    const f = dayFactor(o, 4200);
    const dayRand = seededRand(5300 + o * 131);
    const dayDishes: Portions = {};
    DISH_BASE.forEach((m) => {
      const cooked = Math.max(4, Math.round(m.base * f * (0.95 + dayRand() * 0.1)));
      let sold = Math.round(cooked * (0.55 + dayRand() * 0.42));
      if (sold > cooked) sold = cooked;
      dayDishes[m.id] = { cooked, sold };
    });
    data[o] = dayDishes;
  }
  return data;
})();

export default function AdminDailyPortionsPage() {
  const [portions, setPortions] = useState(INITIAL_PORTIONS);
  const [offset, setOffset] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logDishId, setLogDishId] = useState<string | null>(null);

  const isToday = offset === 0;
  const isPast = offset > 0;
  const dayPortions = isToday ? portions : HISTORICAL[offset]!;

  const dishes = DISH_BASE.map((m) => {
    const p = dayPortions[m.id]!;
    const remaining = p.cooked - p.sold;
    const soldOut = remaining <= 0;
    const pct = p.cooked > 0 ? remaining / p.cooked : 0;
    const soldPct = p.cooked > 0 ? Math.round((p.sold / p.cooked) * 100) : 0;
    let remainingClass = "text-success";
    let barClass = "bg-success";
    if (soldOut) {
      remainingClass = "text-accent";
      barClass = "bg-accent";
    } else if (pct < 0.3) {
      remainingClass = "text-warning";
      barClass = "bg-warning";
    }
    return { ...m, cooked: p.cooked, sold: p.sold, remaining, soldOut, soldPct, remainingClass, barClass };
  });

  const totalCooked = dishes.reduce((n, d) => n + d.cooked, 0);
  const totalSold = dishes.reduce((n, d) => n + d.sold, 0);
  const totalRemaining = dishes.reduce((n, d) => n + d.remaining, 0);
  const lowCount = dishes.filter((d) => d.soldOut || (d.cooked > 0 && d.remaining / d.cooked < 0.2)).length;
  const logDish = logDishId ? dishes.find((d) => d.id === logDishId) : dishes[0];

  const trendBars = useMemo(() => {
    const offsets: number[] = [];
    for (let o = 29; o >= 0; o--) offsets.push(o);
    const totals = offsets.map((o) => {
      if (o === 0 && isToday) return totalSold;
      const d = HISTORICAL[o]!;
      return DISH_BASE.reduce((n, m) => n + d[m.id]!.sold, 0);
    });
    const max = Math.max(...totals, 1);
    return offsets.map((o, i) => ({
      height: Math.max(4, Math.round((totals[i]! / max) * 56)) + "px",
      selected: o === offset,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, isToday, totalSold]);

  const insightText = useMemo(() => {
    const avgOffsets: number[] = [];
    for (let o = 1; o <= 30; o++) avgOffsets.push(o);
    const avgTotal = avgOffsets.reduce((n, o) => n + DISH_BASE.reduce((nn, m) => nn + HISTORICAL[o]![m.id]!.sold, 0), 0) / avgOffsets.length;
    const pctVsAvg = avgTotal > 0 ? Math.round(((totalSold - avgTotal) / avgTotal) * 100) : 0;

    if (isToday) {
      return pctVsAvg >= 0
        ? `Portions sold today are ${pctVsAvg}% above your 30-day average.`
        : `Portions sold today are ${Math.abs(pctVsAvg)}% below your 30-day average — worth a check on foot traffic.`;
    }
    const dow = dateForOffset(offset).getDay();
    const sameDowOffsets: number[] = [];
    for (let o = 7; o <= 28; o += 7) if (dateForOffset(o).getDay() === dow) sameDowOffsets.push(o);
    const sameDowVals = sameDowOffsets.map((o) => DISH_BASE.reduce((n, m) => n + HISTORICAL[o]![m.id]!.sold, 0));
    const isSlowest = sameDowVals.length > 0 && totalSold <= Math.min(...sameDowVals);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (isSlowest && sameDowVals.length >= 2) return `This was your slowest ${dayNames[dow]} in ${sameDowVals.length} weeks.`;
    return pctVsAvg >= 0
      ? `Portions sold this day were ${pctVsAvg}% above your 30-day average.`
      : `Portions sold this day were ${Math.abs(pctVsAvg)}% below your 30-day average.`;
  }, [offset, isToday, totalSold]);

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

  function simulateOrder() {
    const inStock = Object.entries(portions).filter(([, p]) => p.sold < p.cooked);
    if (inStock.length === 0) return;
    const [pickId] = inStock[Math.floor(Math.random() * inStock.length)]!;
    setPortions((s) => ({ ...s, [pickId]: { ...s[pickId]!, sold: s[pickId]!.sold + 1 } }));
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg px-5 lg:px-7">
        <h1 className="text-[18px] font-extrabold text-heading">Daily Portions</h1>
        <div className="flex items-center gap-2.5">
          {isToday ? (
            <>
              <button onClick={simulateOrder} className="hidden items-center gap-1.5 rounded-[10px] border border-admin-danger-border bg-admin-danger px-3.5 py-2.5 text-[12px] font-bold text-accent sm:flex">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>
                Simulate an order (demo)
              </button>
              <button onClick={() => setLogModalOpen(true)} className="flex items-center gap-1.5 rounded-[10px] bg-heading px-4 py-2.5 text-[12.5px] font-bold text-bg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>
                Log portions
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded-[10px] border border-admin-danger-border bg-admin-danger px-3.5 py-2.5 text-[11.5px] font-bold text-[#8A1512] dark:text-[#FFB4A8]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
              Historical view — read only
            </span>
          )}
        </div>
      </div>

      <div className="p-5 lg:p-7">
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
          {isPast && (
            <button onClick={() => setOffset(0)} className="rounded-full bg-heading px-3.5 py-[7px] text-[11.5px] font-bold text-bg">Today</button>
          )}

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
            <h3 className="text-[12.5px] font-bold text-heading">Portions sold — last 30 days</h3>
            <span className="text-[11px] font-bold text-muted">{totalSold} on {fmtShort(offset)}</span>
          </div>
          <div className="flex h-[60px] items-end gap-[3px]">
            {trendBars.map((bar, i) => (
              <div key={i} className="flex h-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-[2px] ${bar.selected ? "border border-[#8A1512] bg-accent" : "bg-border"}`}
                  style={{ height: bar.height }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-[18px] flex items-center gap-2.5 rounded-xl2 border border-admin-danger-border bg-admin-danger px-3.5 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>
          <span className="text-[11.5px] font-semibold text-[#8A1512] dark:text-[#FFB4A8]">{insightText}</span>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard label={isToday ? "Cooked today" : "Cooked that day"} value={String(totalCooked)} />
          <StatCard label={isToday ? "Sold today" : "Sold that day"} value={String(totalSold)} />
          <StatCard label="Remaining" value={String(totalRemaining)} />
          <StatCard label="Running low" value={String(lowCount)} danger />
        </div>

        <div className="mb-[18px] flex items-center gap-2.5 rounded-xl2 border border-dashed border-muted-border-strong bg-bg px-3.5 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          <span className="text-[11.5px] font-semibold text-muted">This is a prototype — &ldquo;Log portions&rdquo; and &ldquo;Simulate an order&rdquo; update the numbers below only in this demo. No live kitchen or ordering system is connected.</span>
        </div>

        {/* Mobile card list */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {dishes.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="mb-2.5 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-[10px] bg-bg" style={{ filter: d.soldOut ? "grayscale(1)" : "none" }} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[13px] font-bold ${d.soldOut ? "text-muted" : "text-heading"}`}>{d.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted">Cooked {d.cooked} · Sold {d.sold}</div>
                </div>
                <span className={`shrink-0 text-[13px] font-extrabold tabular-nums ${d.remainingClass}`}>{d.soldOut ? "SOLD OUT" : d.remaining}</span>
              </div>
              <div className="mb-2.5 h-[7px] overflow-hidden rounded-full bg-border">
                <div className={`h-full rounded-full ${d.barClass}`} style={{ width: `${d.soldPct}%` }} />
              </div>
              {isToday && (
                <button
                  onClick={() => {
                    setLogDishId(d.id);
                    setLogModalOpen(true);
                  }}
                  className="w-full rounded-[9px] border border-border bg-bg py-2 text-[11.5px] font-bold text-heading"
                >
                  Log portions cooked
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          <div className="grid grid-cols-[56px_1.6fr_0.9fr_0.9fr_1fr_1.2fr_110px] border-b border-border bg-admin-row-hover px-[18px] py-3">
            <span />
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Dish</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Cooked</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Sold</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Remaining</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Progress</span>
            <span />
          </div>
          {dishes.map((d) => (
            <div key={d.id} className="grid grid-cols-[56px_1.6fr_0.9fr_0.9fr_1fr_1.2fr_110px] items-center border-b border-admin-row-border px-[18px] py-3 transition-colors hover:bg-admin-row-hover">
              <div className="h-[38px] w-[38px] rounded-[10px] bg-bg" style={{ filter: d.soldOut ? "grayscale(1)" : "none" }} />
              <div>
                <div className={`text-[13px] font-bold ${d.soldOut ? "text-muted" : "text-heading"}`}>{d.name}</div>
                {d.soldOut && <div className="mt-0.5 text-[10px] font-bold text-accent">SOLD OUT</div>}
              </div>
              <span className="text-[12.5px] font-bold tabular-nums text-heading">{d.cooked}</span>
              <span className="text-[12.5px] tabular-nums text-body">{d.sold}</span>
              <span className={`text-[13px] font-extrabold tabular-nums ${d.remainingClass}`}>{d.soldOut ? "SOLD OUT" : d.remaining}</span>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className={`h-full rounded-full ${d.barClass}`} style={{ width: `${d.soldPct}%` }} />
              </div>
              {isToday && (
                <button
                  onClick={() => {
                    setLogDishId(d.id);
                    setLogModalOpen(true);
                  }}
                  className="justify-self-end rounded-lg border border-border px-3 py-[7px] text-[11px] font-bold text-heading"
                >
                  Log cooked
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setLogModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-[20px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="mb-[18px] flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-heading">Log portions cooked</h3>
              <button onClick={() => setLogModalOpen(false)} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-5 flex flex-col gap-3.5">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Dish</label>
                <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
                  <select className="w-full border-none bg-transparent text-[13px] text-heading outline-none">
                    <option>{logDish?.name}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Portions cooked</label>
                  <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
                    <input defaultValue="20" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Time</label>
                  <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
                    <input defaultValue="Now — 12:40pm" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setLogModalOpen(false)} className="px-3.5 py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
              <button onClick={() => setLogModalOpen(false)} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">Log portions</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${danger ? "border-admin-danger-border bg-admin-danger" : "border-border bg-card"}`}>
      <p className={`mb-2 text-[11px] font-bold uppercase tracking-[0.05em] ${danger ? "text-[#8A1512] dark:text-[#FFB4A8]" : "text-muted"}`}>{label}</p>
      <p className={`text-[24px] font-extrabold tabular-nums ${danger ? "text-accent" : "text-heading"}`}>{value}</p>
    </div>
  );
}
