"use client";

import { useMemo, useState } from "react";

interface RiderBase {
  id: string;
  initial: string;
  name: string;
  rating: string;
  baseDeliveries: number;
  liveStatusLabel: string;
  liveStatusColor: string;
}

const RIDER_BASE: RiderBase[] = [
  { id: "sadiq", initial: "S", name: "Sadiq Musa", rating: "4.9", baseDeliveries: 11, liveStatusLabel: "On delivery · #29F-1042", liveStatusColor: "#D9822B" },
  { id: "blessing", initial: "B", name: "Blessing Uche", rating: "4.8", baseDeliveries: 8, liveStatusLabel: "Online · idle", liveStatusColor: "#1F7A45" },
  { id: "kelechi", initial: "K", name: "Kelechi Obi", rating: "4.7", baseDeliveries: 9, liveStatusLabel: "On delivery · #29F-1039", liveStatusColor: "#D9822B" },
  { id: "aminu", initial: "A", name: "Aminu Bello", rating: "4.9", baseDeliveries: 10, liveStatusLabel: "Online · idle", liveStatusColor: "#1F7A45" },
  { id: "tochukwu", initial: "T", name: "Tochukwu Eze", rating: "4.6", baseDeliveries: 7, liveStatusLabel: "On delivery · #29F-1038", liveStatusColor: "#D9822B" },
  { id: "musa", initial: "M", name: "Musa Danladi", rating: "4.8", baseDeliveries: 6, liveStatusLabel: "Online · idle", liveStatusColor: "#1F7A45" },
  { id: "chiamaka", initial: "C", name: "Chiamaka Nnadi", rating: "4.9", baseDeliveries: 12, liveStatusLabel: "Offline since 5:20pm", liveStatusColor: "#B4A796" },
  { id: "david", initial: "D", name: "David Okon", rating: "4.5", baseDeliveries: 5, liveStatusLabel: "Offline since 3:00pm", liveStatusColor: "#B4A796" },
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
  if (isWeekendOffset(offset)) f *= 1.15 + rand() * 0.1;
  else f *= 0.92 + rand() * 0.08;
  f *= 1 - offset * 0.0022;
  if (rand() < 0.08) f *= 0.65 + rand() * 0.15;
  return f;
}

interface DayData {
  onTimePct: number;
  perRider: Record<string, { deliveries: number; onTimeCount: number }>;
  totalDeliveries: number;
}

const HISTORICAL: Record<number, DayData> = (() => {
  const data: Record<number, DayData> = {};
  for (let o = 0; o <= 44; o++) {
    const f = dayFactor(o, 9100);
    const dayRand = seededRand(10200 + o * 173);
    const onTimePct = Math.max(55, Math.min(99, Math.round(88 * (0.95 + dayRand() * 0.1) - (1 - f) * 20)));
    const perRider: DayData["perRider"] = {};
    RIDER_BASE.forEach((r) => {
      const deliveries = Math.max(0, Math.round(r.baseDeliveries * f * (0.85 + dayRand() * 0.3)));
      const onTimeCount = Math.round(deliveries * (onTimePct / 100) * (0.9 + dayRand() * 0.2));
      perRider[r.id] = { deliveries, onTimeCount: Math.min(deliveries, onTimeCount) };
    });
    const totalDeliveries = RIDER_BASE.reduce((n, r) => n + perRider[r.id]!.deliveries, 0);
    data[o] = { onTimePct, perRider, totalDeliveries };
  }
  return data;
})();

export default function AdminRidersPage() {
  const [offset, setOffset] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [addRiderModalOpen, setAddRiderModalOpen] = useState(false);

  const isToday = offset === 0;
  const isPast = offset > 0;
  const dayData = HISTORICAL[offset]!;

  const onlineCount = RIDER_BASE.filter((r) => r.liveStatusColor === "#1F7A45").length;
  const onDeliveryCount = RIDER_BASE.filter((r) => r.liveStatusColor === "#D9822B").length;

  const riders = RIDER_BASE.map((r) => {
    const rd = dayData.perRider[r.id]!;
    return { ...r, deliveries: rd.deliveries, onTimeCount: rd.onTimeCount };
  });

  const onTimePctLabel = dayData.onTimePct + "%";
  const onlineLabel = isToday ? "Online now" : "Total deliveries";
  const onlineValue = isToday ? onlineCount : dayData.totalDeliveries;
  const secondLabel = isToday ? "On delivery" : "Riders active";
  const secondValue = isToday ? onDeliveryCount : riders.filter((r) => r.deliveries > 0).length;

  const trendBars = useMemo(() => {
    const offsets: number[] = [];
    for (let o = 29; o >= 0; o--) offsets.push(o);
    const vals = offsets.map((o) => HISTORICAL[o]!.onTimePct);
    const max = Math.max(...vals, 1);
    return offsets.map((o, i) => ({ height: Math.max(4, Math.round((vals[i]! / max) * 56)) + "px", selected: o === offset }));
  }, [offset]);

  const insightText = useMemo(() => {
    const avgOffsets: number[] = [];
    for (let o = 1; o <= 30; o++) avgOffsets.push(o);
    const avgOnTime = avgOffsets.reduce((n, o) => n + HISTORICAL[o]!.onTimePct, 0) / avgOffsets.length;
    const diffPts = Math.round(dayData.onTimePct - avgOnTime);

    if (isToday) {
      return diffPts >= 0
        ? `On-time delivery today is running ${diffPts} points above your 30-day average.`
        : `On-time delivery today is ${Math.abs(diffPts)} points below your 30-day average — worth checking in with riders.`;
    }
    const dow = dateForOffset(offset).getDay();
    const sameDowOffsets: number[] = [];
    for (let o = 7; o <= 28; o += 7) if (dateForOffset(o).getDay() === dow) sameDowOffsets.push(o);
    const sameDowVals = sameDowOffsets.map((o) => HISTORICAL[o]!.onTimePct);
    const isBest = sameDowVals.length > 0 && dayData.onTimePct >= Math.max(...sameDowVals);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (isBest && sameDowVals.length >= 2) return `This was your best ${dayNames[dow]} for on-time delivery in ${sameDowVals.length} weeks.`;
    return diffPts >= 0
      ? `On-time delivery that day was ${diffPts} points above your 30-day average.`
      : `On-time delivery that day was ${Math.abs(diffPts)} points below your 30-day average.`;
  }, [offset, isToday, dayData.onTimePct]);

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
        <h1 className="text-[18px] font-extrabold text-heading">Riders</h1>
        {isToday ? (
          <button onClick={() => setAddRiderModalOpen(true)} className="flex items-center gap-1.5 rounded-[10px] bg-heading px-4 py-2.5 text-[12.5px] font-bold text-bg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>
            Add rider
          </button>
        ) : (
          <span className="flex items-center gap-1.5 rounded-[10px] border border-admin-danger-border bg-admin-danger px-3.5 py-2.5 text-[11.5px] font-bold text-[#8A1512] dark:text-[#FFB4A8]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
            Historical view — read only
          </span>
        )}
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
            <h3 className="text-[12.5px] font-bold text-heading">On-time delivery % — last 30 days</h3>
            <span className="text-[11px] font-bold text-muted">{onTimePctLabel} on {fmtShort(offset)}</span>
          </div>
          <div className="flex h-[60px] items-end gap-[3px]">
            {trendBars.map((bar, i) => (
              <div key={i} className="flex h-full flex-1 items-end">
                <div className={`w-full rounded-t-[2px] ${bar.selected ? "border border-[#8A1512] bg-accent" : "bg-border"}`} style={{ height: bar.height }} />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-[18px] flex items-center gap-2.5 rounded-xl2 border border-admin-danger-border bg-admin-danger px-3.5 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>
          <span className="text-[11.5px] font-semibold text-[#8A1512] dark:text-[#FFB4A8]">{insightText}</span>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2.5 lg:gap-3.5">
          <StatCard label={onlineLabel} value={String(onlineValue)} valueClass="text-success" />
          <StatCard label={secondLabel} value={String(secondValue)} valueClass="text-warning" />
          <StatCard label={`On-time %${isToday ? "" : " (that day)"}`} value={onTimePctLabel} />
        </div>

        {/* Mobile card list */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {riders.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              <div className="relative shrink-0">
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-border text-[14px] font-extrabold text-body">{r.initial}</div>
                {isToday && <span className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full ring-2 ring-card" style={{ background: r.liveStatusColor }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-heading">{r.name}</div>
                <div className="mt-0.5 text-[11px] text-muted">{isToday ? r.liveStatusLabel : `${r.deliveries} deliveries · ${r.onTimeCount} on-time`}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[12.5px] font-extrabold text-heading">{r.rating} ★</div>
                {isToday && <div className="mt-0.5 text-[10.5px] text-muted">{r.deliveries} today</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          {isToday ? (
            <>
              <div className="grid grid-cols-[1.6fr_1.2fr_1fr_1fr_90px] border-b border-border bg-admin-row-hover px-[18px] py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Rider</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Live status</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Rating</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Deliveries today</span>
                <span />
              </div>
              {riders.map((r) => (
                <div key={r.id} className="grid grid-cols-[1.6fr_1.2fr_1fr_1fr_90px] items-center border-b border-admin-row-border px-[18px] py-3 transition-colors hover:bg-admin-row-hover">
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-[12px] font-extrabold text-body">{r.initial}</div>
                      <span className="absolute bottom-0 right-0 h-[9px] w-[9px] rounded-full ring-2 ring-card" style={{ background: r.liveStatusColor }} />
                    </div>
                    <span className="text-[13px] font-bold text-heading">{r.name}</span>
                  </div>
                  <span className="text-[12px] text-body">{r.liveStatusLabel}</span>
                  <span className="text-[12.5px] font-bold text-heading">{r.rating} ★</span>
                  <span className="text-[12.5px] tabular-nums text-body">{r.deliveries}</span>
                  <span className="text-right text-[11.5px] font-bold text-admin-nav-active">View →</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-border bg-admin-row-hover px-[18px] py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Rider</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Deliveries that day</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">On-time</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Rating</span>
              </div>
              {riders.map((r) => (
                <div key={r.id} className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center border-b border-admin-row-border px-[18px] py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border text-[12px] font-extrabold text-body">{r.initial}</div>
                    <span className="text-[13px] font-bold text-heading">{r.name}</span>
                  </div>
                  <span className="text-[12.5px] tabular-nums text-body">{r.deliveries}</span>
                  <span className="text-[12.5px] tabular-nums text-body">{r.onTimeCount}</span>
                  <span className="text-[12.5px] font-bold text-heading">{r.rating} ★</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {addRiderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAddRiderModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-[20px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="mb-[18px] flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-heading">Add rider</h3>
              <button onClick={() => setAddRiderModalOpen(false)} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-5 flex flex-col gap-3.5">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Full name</label>
                <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
                  <input placeholder="e.g. Uche Nwankwo" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Phone number</label>
                <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
                  <input placeholder="080X XXX XXXX" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Delivery zone</label>
                  <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
                    <select className="w-full border-none bg-transparent text-[13px] text-heading outline-none">
                      <option>Peace Lodge</option>
                      <option>Hilltop Hostel</option>
                      <option>Unity Hall</option>
                      <option>Off-campus</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Vehicle type</label>
                  <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
                    <select className="w-full border-none bg-transparent text-[13px] text-heading outline-none">
                      <option>Motorcycle</option>
                      <option>Bicycle</option>
                      <option>On foot</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setAddRiderModalOpen(false)} className="px-3.5 py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
              <button onClick={() => setAddRiderModalOpen(false)} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">Save rider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className={`text-[19px] font-extrabold tabular-nums lg:text-[24px] ${valueClass ?? "text-heading"}`}>{value}</p>
    </div>
  );
}
