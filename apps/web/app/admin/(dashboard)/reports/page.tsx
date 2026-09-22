"use client";

import { useMemo, useState } from "react";
import {
  aggregateRange,
  buildDayReport,
  dailyHistorical,
  dateForOffset,
  delta,
  fC,
  fN,
  fmtHeader,
  fmtShort,
  pct1,
  type RangeAgg,
} from "@/components/admin/reports/engine";

type ViewMode = "range" | "day";

export default function AdminReportsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("range");
  const [rangeDays, setRangeDays] = useState(30);
  const [offset, setOffset] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [costsModalOpen, setCostsModalOpen] = useState(false);

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
        <h1 className="text-[18px] font-extrabold text-heading">Reports</h1>
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1 rounded-[10px] border border-border bg-card p-1">
            <button onClick={() => setViewMode("range")} className={`rounded-[7px] px-3 py-1.5 text-[12px] font-bold ${viewMode === "range" ? "bg-heading text-bg" : "text-muted"}`}>Range</button>
            <button onClick={() => setViewMode("day")} className={`rounded-[7px] px-3 py-1.5 text-[12px] font-bold ${viewMode === "day" ? "bg-heading text-bg" : "text-muted"}`}>Day</button>
          </div>
          <button className="hidden items-center gap-1.5 rounded-[10px] bg-heading px-4 py-2.5 text-[12.5px] font-bold text-bg sm:flex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
            Export
          </button>
        </div>
      </div>

      <div className="p-5 lg:p-7">
        {viewMode === "range" ? (
          <RangeView rangeDays={rangeDays} setRangeDays={setRangeDays} />
        ) : (
          <DayView
            offset={offset}
            setOffset={setOffset}
            datePickerOpen={datePickerOpen}
            setDatePickerOpen={setDatePickerOpen}
            dateGroups={dateGroups}
            costsModalOpen={costsModalOpen}
            setCostsModalOpen={setCostsModalOpen}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Range view

function RangeView({ rangeDays, setRangeDays }: { rangeDays: number; setRangeDays: (d: number) => void }) {
  const [openSections, setOpenSections] = useState({ unit: true, customers: false, menu: false, ops: false, quality: false });
  const toggle = (k: keyof typeof openSections) => setOpenSections((s) => ({ ...s, [k]: !s[k] }));

  const cur = useMemo(() => aggregateRange(0, rangeDays), [rangeDays]);
  const prev = useMemo(() => aggregateRange(rangeDays, rangeDays), [rangeDays]);
  const D = (c: number, p: number, opts?: { unit?: "pts"; lowerBetter?: boolean }) => delta(c, p, rangeDays, opts);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fd = (off: number) => {
    const d = dateForOffset(off);
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };
  const periodLabel = `${fd(rangeDays - 1)} – ${fd(0)} · ${rangeDays} operating days`;
  const compareLabel = `Compared with ${fd(2 * rangeDays - 1)} – ${fd(rangeDays)} (prior ${rangeDays}d)`;

  const salesTiles = [
    { label: "Total revenue", value: fC(cur.revenue), sub: fN(cur.revenue), d: D(cur.revenue, prev.revenue) },
    { label: "Delivery revenue", value: fC(cur.deliveryRevenue), sub: pct1((cur.deliveryRevenue / cur.revenue) * 100) + " of revenue", d: D(cur.deliveryRevenue, prev.deliveryRevenue) },
    { label: "Walk-in / counter", value: fC(cur.walkInRevenue), sub: pct1((cur.walkInRevenue / cur.revenue) * 100) + " of revenue", d: D(cur.walkInRevenue, prev.walkInRevenue) },
    { label: "Orders", value: cur.orders.toLocaleString("en-NG"), sub: `${cur.deliveryOrders} delivery · ${cur.walkInOrders} counter`, d: D(cur.orders, prev.orders) },
    { label: "Avg order value", value: fN(cur.aov), sub: `across ${cur.orders} orders`, d: D(cur.aov, prev.aov) },
    { label: "Revenue / operating day", value: fN(cur.revenuePerDay), sub: `over ${rangeDays} days`, d: D(cur.revenuePerDay, prev.revenuePerDay) },
    { label: "Gross margin", value: fC(cur.grossProfit), sub: pct1(cur.grossMarginPct) + " after food cost", d: D(cur.grossMarginPct, prev.grossMarginPct, { unit: "pts" }) },
    { label: "Net profit", value: fC(cur.netProfit), sub: pct1(cur.netMarginPct) + " after all costs", d: D(cur.netMarginPct, prev.netMarginPct, { unit: "pts" }) },
  ];

  const buckets = rangeDays === 7 ? 7 : rangeDays === 30 ? 6 : 9;
  const size = rangeDays / buckets;
  let maxRev = 1;
  const raw: { rev: number; cost: number; startOffset: number }[] = [];
  for (let b = 0; b < buckets; b++) {
    const end = Math.round(rangeDays - b * size);
    const start = Math.round(rangeDays - (b + 1) * size);
    let rev = 0, cost = 0;
    for (let o = start; o < end; o++) {
      const d = aggregateRange(o, 1);
      rev += d.revenue; cost += d.totalCosts;
    }
    if (rev > maxRev) maxRev = rev;
    raw.push({ rev, cost, startOffset: end - 1 });
  }
  const chartBars = raw.map((r) => {
    const dt = dateForOffset(r.startOffset);
    const label = rangeDays === 7 ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()] : `${dt.getDate()} ${months[dt.getMonth()]}`;
    const h = Math.max(10, Math.round((r.rev / maxRev) * 138));
    const costShare = Math.max(0, Math.min(1, r.cost / Math.max(1, r.rev)));
    return { label, revLabel: fC(r.rev), height: h, costFlex: Math.round(costShare * 1000), profitFlex: Math.max(1, Math.round((1 - costShare) * 1000)) };
  });

  const deliveryGap = cur.deliveryFeePerOrder - cur.deliveryCostPerOrder;
  const prevGap = prev.deliveryFeePerOrder - prev.deliveryCostPerOrder;
  const unitTiles = [
    { label: "Cost to fulfil 1 order", value: fN(cur.costPerOrder), sub: "all costs ÷ orders", d: D(cur.costPerOrder, prev.costPerOrder, { lowerBetter: true }) },
    { label: "Profit per order", value: fN(cur.profitPerOrder), sub: pct1(cur.netMarginPct) + " of order value", d: D(cur.profitPerOrder, prev.profitPerOrder) },
    { label: "Delivery cost / order", value: fN(cur.deliveryCostPerOrder), sub: "rider payout + fuel", d: D(cur.deliveryCostPerOrder, prev.deliveryCostPerOrder, { lowerBetter: true }) },
    { label: "Delivery fee / order", value: fN(cur.deliveryFeePerOrder), sub: (deliveryGap >= 0 ? "covers cost by " : "short of cost by ") + fN(Math.abs(deliveryGap)), d: D(deliveryGap, prevGap) },
    { label: "Food cost % of revenue", value: pct1(cur.foodCostPct), sub: fN(cur.foodCost) + " of ingredients", d: D(cur.foodCostPct, prev.foodCostPct, { unit: "pts", lowerBetter: true }) },
    { label: "Labour % of revenue", value: pct1(cur.labourPct), sub: fN(cur.wages) + " in wages", d: D(cur.labourPct, prev.labourPct, { unit: "pts", lowerBetter: true }) },
  ];
  const unitHighlight = `${fN(cur.profitPerOrder)} profit per order · food at ${pct1(cur.foodCostPct)}`;

  const prev2 = useMemo(() => aggregateRange(2 * rangeDays, rangeDays), [rangeDays]);
  const retention = Math.max(0, Math.min(100, (cur.distinctReturning / Math.max(1, prev.distinctCustomers)) * 100));
  const prevRetention = Math.max(0, Math.min(100, (prev.distinctReturning / Math.max(1, prev2.distinctCustomers)) * 100));
  const churn = 100 - retention;
  const prevChurn = 100 - prevRetention;
  const custTiles = [
    { label: "New customers", value: cur.newCust.toLocaleString("en-NG"), sub: "first order in period", d: D(cur.newCust, prev.newCust) },
    { label: "Returning customers", value: cur.distinctReturning.toLocaleString("en-NG"), sub: "ordered before this period", d: D(cur.distinctReturning, prev.distinctReturning) },
    { label: "Repeat order rate", value: pct1(cur.repeatRate), sub: "orders from known customers", d: D(cur.repeatRate, prev.repeatRate, { unit: "pts" }) },
    { label: "Orders per customer", value: cur.ordersPerCustomer.toFixed(2), sub: `${cur.distinctCustomers} distinct customers`, d: D(cur.ordersPerCustomer, prev.ordersPerCustomer) },
    { label: "Retention", value: pct1(retention), sub: "of last period's customers came back", d: D(retention, prevRetention, { unit: "pts" }) },
    { label: "Churn", value: pct1(churn), sub: "did not order again", d: D(churn, prevChurn, { unit: "pts", lowerBetter: true }) },
  ];
  const planTiles = [
    { label: "Active subscribers", value: String(cur.planActiveEnd), sub: "meal plans running now", d: D(cur.planActiveEnd, prev.planActiveEnd) },
    { label: "New this period", value: String(cur.planNew), sub: "plans bought", d: D(cur.planNew, prev.planNew) },
    { label: "Renewed", value: String(cur.planRenewed), sub: "plans extended", d: D(cur.planRenewed, prev.planRenewed) },
    { label: "Lapsed", value: String(cur.planLapsed), sub: "plans not renewed", d: D(cur.planLapsed, prev.planLapsed, { lowerBetter: true }) },
  ];
  const custBase = [
    { name: "Ada Okafor", w: 1.0, zone: "Peace Lodge" },
    { name: "Emeka Obi", w: 0.88, zone: "Hilltop Hostel" },
    { name: "Ngozi Eze", w: 0.81, zone: "Peace Lodge" },
    { name: "Chidi Nwosu", w: 0.74, zone: "Unity Hall" },
    { name: "Funke Adeyemi", w: 0.68, zone: "Peace Lodge" },
  ];
  const topCustomers = custBase.map((c, i) => {
    const spend = cur.revenue * 0.011 * c.w;
    return { rank: i + 1, name: c.name, zone: c.zone, spendLabel: fN(spend), ordersLabel: `${Math.max(1, Math.round(spend / cur.aov))} orders` };
  });
  const custHighlight = `${cur.newCust} new · ${pct1(cur.repeatRate)} repeat rate · ${cur.planActiveEnd} plan subscribers`;

  const sortedDishes = [...cur.dishes].sort((a, b) => b.units - a.units);
  const maxUnits = Math.max(1, sortedDishes[0]!.units);
  const bestSellers = sortedDishes.slice(0, 4).map((d, i) => ({
    rank: i + 1, name: d.name,
    unitsLabel: `${d.units.toLocaleString("en-NG")} sold`, revenueLabel: fC(d.revenue),
    sharePct: pct1((d.revenue / cur.revenue) * 100), barPct: Math.max(3, Math.round((d.units / maxUnits) * 100)),
  }));
  const growthOf = (d: RangeAgg["dishes"][number]) => {
    const p = prev.dishes.find((x) => x.name === d.name);
    return p && p.units ? ((d.units - p.units) / p.units) * 100 : 0;
  };
  const ascending = [...sortedDishes].reverse();
  const flat = ascending.filter((d) => growthOf(d) <= 20);
  const weakPool = flat.length >= 3 ? flat : flat.concat(ascending.filter((d) => !flat.includes(d)));
  const worstSellers = weakPool.slice(0, 3).map((d) => {
    const chg = growthOf(d);
    return {
      name: d.name,
      unitsLabel: `${d.units.toLocaleString("en-NG")} sold · ${fC(d.revenue)}`,
      trendLabel: (Math.abs(chg) < 1 ? "→ flat vs prev " : (chg > 0 ? "↑ " : "↓ ") + Math.abs(chg).toFixed(0) + "% vs prev ") + rangeDays + "d",
      trendColorClass: Math.abs(chg) < 1 ? "text-warning" : chg > 0 ? "text-success" : "text-accent",
    };
  });
  const catMap = new Map<string, number>();
  cur.dishes.forEach((d) => catMap.set(d.cat, (catMap.get(d.cat) ?? 0) + d.revenue));
  catMap.set("Drinks & sides", cur.drinksRev);
  catMap.set("Meal plans", cur.planRev);
  catMap.set("Delivery fees", cur.deliveryFees);
  const catRows = [...catMap.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
  const catMax = Math.max(1, catRows[0]!.amount);
  const categories = catRows.map((c) => ({ label: c.label, amount: fC(c.amount), sharePct: pct1((c.amount / cur.gross) * 100), barPct: Math.max(3, Math.round((c.amount / catMax) * 100)) }));
  const soldOut = [...cur.dishes].sort((a, b) => b.soldOutDays - a.soldOutDays).filter((d) => d.soldOutDays > 0).slice(0, 3)
    .map((d) => ({ name: d.name, detail: `${d.soldOutDays} of ${rangeDays} days · ${pct1((d.soldOutDays / rangeDays) * 100)} of days` }));
  const menuHighlight = `${sortedDishes[0]!.name} leads with ${sortedDishes[0]!.units} sold · ${pct1(cur.attachRate)} add-on attach`;

  const opsTiles = [
    { label: "Portions cooked", value: cur.cooked.toLocaleString("en-NG"), sub: `over ${rangeDays} days`, d: D(cur.cooked, prev.cooked) },
    { label: "Portions sold", value: cur.sold.toLocaleString("en-NG"), sub: pct1((cur.sold / Math.max(1, cur.cooked)) * 100) + " of what was cooked", d: D(cur.sold, prev.sold) },
    { label: "Portions wasted", value: cur.wasted.toLocaleString("en-NG"), sub: "unsold at close", d: D(cur.wasted, prev.wasted, { lowerBetter: true }) },
    { label: "Waste rate", value: pct1(cur.wastePct), sub: "of portions cooked", d: D(cur.wastePct, prev.wastePct, { unit: "pts", lowerBetter: true }) },
    { label: "Avg prep time", value: cur.avgPrep.toFixed(1) + " min", sub: "order placed to ready", d: D(cur.avgPrep, prev.avgPrep, { lowerBetter: true }) },
    { label: "Avg delivery time", value: cur.avgDelivery.toFixed(1) + " min", sub: "ready to doorstep", d: D(cur.avgDelivery, prev.avgDelivery, { lowerBetter: true }) },
    { label: "On-time delivery", value: pct1(cur.onTimePct), sub: `${cur.onTimeDeliveries} of ${cur.deliveries}`, d: D(cur.onTimePct, prev.onTimePct, { unit: "pts" }) },
    { label: "Deliveries per rider", value: cur.deliveriesPerRider.toFixed(0), sub: `across 4 riders, ${rangeDays}d`, d: D(cur.deliveriesPerRider, prev.deliveriesPerRider) },
  ];
  const maxRiderDel = Math.max(1, ...cur.riders.map((r) => r.deliveries));
  const ridersSorted = [...cur.riders].sort((a, b) => b.deliveries - a.deliveries).map((r) => {
    const p = (r.onTime / Math.max(1, r.deliveries)) * 100;
    return { name: r.name, deliveriesLabel: `${r.deliveries.toLocaleString("en-NG")} deliveries`, onTimeLabel: pct1(p) + " on time", onTimeColorClass: p >= 90 ? "text-success" : p >= 82 ? "text-warning" : "text-accent", barPct: Math.max(3, Math.round((r.deliveries / maxRiderDel) * 100)) };
  });
  const overheadPerOrder = (cur.wages + cur.gas + cur.electricity + cur.misc) / Math.max(1, cur.orders);
  const zonesOut = cur.zones.map((z) => {
    const avgTime = z.timeSum / Math.max(1, z.orders);
    const perOrderDelivery = (z.feeTotal - z.costTotal) / Math.max(1, z.orders);
    const zoneProfit = z.revenue * (1 - cur.foodCostPct / 100) - z.costTotal - overheadPerOrder * z.orders;
    const perOrderProfit = zoneProfit / Math.max(1, z.orders);
    return {
      name: z.name, ordersLabel: `${z.orders.toLocaleString("en-NG")} orders`, revenueLabel: fC(z.revenue), timeLabel: `${avgTime.toFixed(0)} min avg`,
      deliveryLabel: `${perOrderDelivery >= 0 ? "+" : "−"}${fN(Math.abs(perOrderDelivery))} / order on delivery`, deliveryColorClass: perOrderDelivery >= 0 ? "text-success" : "text-accent",
      profitLabel: `${perOrderProfit >= 0 ? "+" : "−"}${fN(Math.abs(perOrderProfit))} net / order`, profitColorClass: perOrderProfit >= 0 ? "text-success" : "text-accent",
      profitBgClass: perOrderProfit >= 0 ? "bg-success-bg" : "bg-admin-danger",
    };
  });
  const opsHighlight = `${pct1(cur.wastePct)} waste · ${pct1(cur.onTimePct)} on time · ${cur.avgDelivery.toFixed(0)} min avg delivery`;

  const qualityTiles = [
    { label: "Complaint rate", value: cur.complaintRate.toFixed(2) + " / 100", sub: `${cur.complaints} complaints, ${cur.orders} orders`, d: D(cur.complaintRate, prev.complaintRate, { lowerBetter: true }) },
    { label: "Complaints logged", value: String(cur.complaints), sub: `over ${rangeDays} days`, d: D(cur.complaints, prev.complaints, { lowerBetter: true }) },
    { label: "Discount given", value: fC(cur.discount), sub: pct1(cur.discountPct) + " of revenue", d: D(cur.discount, prev.discount, { lowerBetter: true }) },
    { label: "Promo redemptions", value: String(cur.promos.reduce((a, p) => a + p.uses, 0)), sub: "across 3 active codes", d: D(cur.promos.reduce((a, p) => a + p.uses, 0), prev.promos.reduce((a, p) => a + p.uses, 0)) },
  ];
  const reasonRows = cur.reasons.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const reasonMax = Math.max(1, reasonRows[0]?.count ?? 1);
  const complaintReasons = reasonRows.map((r) => ({ name: r.name, countLabel: `${r.count} · ${pct1((r.count / Math.max(1, cur.complaints)) * 100)}`, barPct: Math.max(3, Math.round((r.count / reasonMax) * 100)) }));
  const resRows = cur.resolutions.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const resolutionsOut = resRows.map((r) => ({ name: r.name, countLabel: String(r.count), sharePct: pct1((r.count / Math.max(1, cur.complaints)) * 100) }));
  const promoMax = Math.max(1, ...cur.promos.map((p) => p.given));
  const promosOut = [...cur.promos].sort((a, b) => b.given - a.given).map((p) => ({ code: p.code, usesLabel: `${p.uses.toLocaleString("en-NG")} uses`, givenLabel: `${fC(p.given)} given`, sharePct: pct1((p.given / Math.max(1, cur.revenue)) * 100) + " of revenue", barPct: Math.max(3, Math.round((p.given / promoMax) * 100)) }));
  const qualityHighlight = `${cur.complaintRate.toFixed(2)} complaints per 100 orders · ${pct1(cur.discountPct)} of revenue discounted`;

  const worstZone = [...cur.zones].map((z) => ({ name: z.name, per: (z.feeTotal - z.costTotal) / Math.max(1, z.orders) })).sort((a, b) => a.per - b.per)[0]!;
  const summaryLines = [
    { dotClass: cur.netMarginPct >= 15 ? "bg-success" : cur.netMarginPct >= 8 ? "bg-warning" : "bg-accent", text: `Net profit is ${fN(cur.netProfit)} on ${fN(cur.revenue)} of revenue — a ${pct1(cur.netMarginPct)} margin over ${rangeDays} days, ${cur.netMarginPct >= prev.netMarginPct ? "up" : "down"} from ${pct1(prev.netMarginPct)} the previous ${rangeDays} days.` },
    { dotClass: cur.foodCostPct <= 35 ? "bg-success" : cur.foodCostPct <= 40 ? "bg-warning" : "bg-accent", text: `Food cost is ${pct1(cur.foodCostPct)} of revenue — ${cur.foodCostPct <= 35 ? "inside" : "above"} the 35% you'd want for this menu mix. Wages add another ${pct1(cur.labourPct)}.` },
    { dotClass: cur.wastePct <= 5 ? "bg-success" : cur.wastePct <= 8 ? "bg-warning" : "bg-accent", text: `Waste is ${pct1(cur.wastePct)} of portions cooked (${cur.wasted.toLocaleString("en-NG")} of ${cur.cooked.toLocaleString("en-NG")}), ${Math.abs(cur.wastePct - prev.wastePct) < 0.1 ? "level with " : cur.wastePct < prev.wastePct ? "down from " : "up from "}${pct1(prev.wastePct)} last period.` },
    { dotClass: worstZone.per >= 0 ? "bg-success" : "bg-accent", text: worstZone.per >= 0 ? `Every zone covers its own delivery cost — ${worstZone.name} is tightest at +${fN(worstZone.per)} per order.` : `Delivery is running at a ${fN(Math.abs(worstZone.per))} loss per order in ${worstZone.name} — the fee there does not cover the rider payout.` },
    { dotClass: cur.discountPct <= 4 ? "bg-success" : cur.discountPct <= 7 ? "bg-warning" : "bg-accent", text: `Promo codes gave away ${fN(cur.discount)} (${pct1(cur.discountPct)} of revenue) while repeat orders ran at ${pct1(cur.repeatRate)} — ${cur.discountPct <= 4 ? "discounting is not eating the margin." : "worth checking whether the discount is buying real repeat business."}` },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-[10px] border border-border bg-card p-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setRangeDays(d)} className={`rounded-[7px] px-3.5 py-1.5 text-[12px] font-bold ${d === rangeDays ? "bg-heading text-bg" : "text-muted"}`}>{d}D</button>
          ))}
        </div>
        <div className="text-right">
          <p className="text-[12.5px] font-bold text-heading">{periodLabel}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-muted">{compareLabel}</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-admin-danger-border bg-admin-danger p-4">
        <div className="mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
          <span className="text-[13px] font-extrabold text-heading">Business health summary</span>
        </div>
        <div className="flex flex-col gap-2">
          {summaryLines.map((l, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${l.dotClass}`} />
              <span className="text-[12.5px] font-semibold leading-[1.55] text-heading">{l.text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted">Sales &amp; revenue health</p>
      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {salesTiles.map((t) => <MetricTile key={t.label} {...t} />)}
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-heading">Revenue vs costs</h3>
          <div className="flex gap-3.5">
            <Legend color="bg-accent" label="Profit" />
            <Legend color="bg-warning" label="Costs" />
          </div>
        </div>
        <p className="mb-4 text-[11.5px] font-semibold tabular-nums text-muted">Revenue {fC(cur.revenue)} · costs {fC(cur.totalCosts)} · profit {fC(cur.netProfit)}</p>
        <div className="flex h-[176px] items-end gap-2.5 lg:gap-3.5">
          {chartBars.map((b, i) => (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] font-bold tabular-nums text-body lg:text-[10.5px]">{b.revLabel}</span>
              <div className="flex w-full max-w-[54px] flex-col overflow-hidden rounded-t-[7px] rounded-b-[3px]" style={{ height: b.height }}>
                <div className="bg-accent" style={{ flexGrow: b.profitFlex }} />
                <div className="bg-warning" style={{ flexGrow: b.costFlex }} />
              </div>
              <span className="text-[10px] font-semibold text-muted lg:text-[10.5px]">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <Accordion title="Unit economics" highlight={unitHighlight} open={openSections.unit} onToggle={() => toggle("unit")}>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            {unitTiles.map((t) => <MiniTile key={t.label} {...t} />)}
          </div>
        </Accordion>

        <Accordion title="Customers & retention" highlight={custHighlight} open={openSections.customers} onToggle={() => toggle("customers")}>
          <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            {custTiles.map((t) => <MiniTile key={t.label} {...t} />)}
          </div>
          <p className="mb-2.5 text-[12px] font-bold text-heading">Meal plan subscribers</p>
          <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {planTiles.map((t) => <MiniTile key={t.label} {...t} small />)}
          </div>
          <p className="mb-2.5 text-[12px] font-bold text-heading">Top customers by spend</p>
          <div className="flex flex-col">
            {topCustomers.map((c) => (
              <div key={c.name} className="flex items-center gap-2.5 border-b border-admin-row-border py-2">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent-tint text-[10.5px] font-extrabold text-admin-nav-active">{c.rank}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold text-heading">{c.name}</div>
                  <div className="text-[10.5px] font-semibold text-muted">{c.zone}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12.5px] font-bold tabular-nums text-heading">{c.spendLabel}</div>
                  <div className="text-[10.5px] font-semibold tabular-nums text-muted">{c.ordersLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </Accordion>

        <Accordion title="Menu performance" highlight={menuHighlight} open={openSections.menu} onToggle={() => toggle("menu")}>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-[12px] font-bold text-heading">Best sellers</p>
              <div className="flex flex-col gap-3">
                {bestSellers.map((d) => (
                  <div key={d.name}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-accent-tint text-[10px] font-extrabold text-admin-nav-active">{d.rank}</span>
                      <span className="min-w-0 flex-1 text-[12.5px] font-bold text-heading">{d.name}</span>
                      <span className="text-[12px] font-bold tabular-nums text-heading">{d.revenueLabel}</span>
                    </div>
                    <div className="mb-1 h-[7px] overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${d.barPct}%` }} />
                    </div>
                    <p className="text-[10.5px] font-semibold tabular-nums text-muted">{d.unitsLabel} · {d.sharePct} of revenue</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[12px] font-bold text-heading">Revenue by category</p>
              <div className="flex flex-col gap-2.5">
                {categories.map((c) => (
                  <div key={c.label}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[12.5px] font-semibold text-body">{c.label}</span>
                      <span className="text-[12px] font-bold tabular-nums text-heading">{c.amount} · {c.sharePct}</span>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-warning" style={{ width: `${c.barPct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="my-4 h-px bg-border" />
          <div className="grid gap-5 lg:grid-cols-3">
            <div>
              <p className="mb-2.5 text-[12px] font-bold text-heading">Sold out most often</p>
              {soldOut.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {soldOut.map((s) => (
                    <div key={s.name} className="rounded-[10px] bg-warning/10 p-2.5">
                      <div className="text-[12px] font-bold text-heading">{s.name}</div>
                      <div className="mt-0.5 text-[10.5px] font-semibold tabular-nums text-warning">{s.detail}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[11.5px] text-muted">Nothing sold out in this period.</span>
              )}
            </div>
            <div>
              <p className="mb-2.5 text-[12px] font-bold text-heading">Weak movers</p>
              <div className="flex flex-col gap-2">
                {worstSellers.map((w) => (
                  <div key={w.name} className="rounded-[10px] bg-admin-row-hover p-2.5">
                    <div className="text-[12px] font-bold text-heading">{w.name}</div>
                    <div className="mt-0.5 text-[10.5px] font-semibold tabular-nums text-muted">{w.unitsLabel}</div>
                    <div className={`mt-0.5 text-[10.5px] font-bold tabular-nums ${w.trendColorClass}`}>{w.trendLabel}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2.5 text-[12px] font-bold text-heading">Add-on / combo attach</p>
              <div className="rounded-xl2 bg-admin-row-hover p-3.5">
                <div className="text-[26px] font-extrabold tabular-nums text-heading">{pct1(cur.attachRate)}</div>
                <div className="mt-1 text-[11px] font-semibold leading-[1.45] text-muted">of orders included a drink, side or protein add-on</div>
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion title="Operations health" highlight={opsHighlight} open={openSections.ops} onToggle={() => toggle("ops")}>
          <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {opsTiles.map((t) => <MiniTile key={t.label} {...t} small />)}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
            <div>
              <p className="mb-3 text-[12px] font-bold text-heading">Rider performance</p>
              <div className="flex flex-col gap-3">
                {ridersSorted.map((r) => (
                  <div key={r.name}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[12.5px] font-bold text-heading">{r.name}</span>
                      <span className={`text-[11px] font-bold tabular-nums ${r.onTimeColorClass}`}>{r.onTimeLabel}</span>
                    </div>
                    <div className="mb-1 h-[7px] overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${r.barPct}%` }} />
                    </div>
                    <p className="text-[10.5px] font-semibold tabular-nums text-muted">{r.deliveriesLabel}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[12px] font-bold text-heading">Delivery zone performance</p>
              <div className="flex flex-col gap-2.5">
                {zonesOut.map((z) => (
                  <div key={z.name} className={`rounded-xl2 p-3 ${z.profitBgClass}`}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[12.5px] font-bold text-heading">{z.name}</span>
                      <span className={`text-[12px] font-bold tabular-nums ${z.profitColorClass}`}>{z.profitLabel}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[10.5px] font-semibold tabular-nums text-muted">{z.ordersLabel}</span>
                      <span className="text-[10.5px] font-semibold tabular-nums text-muted">{z.revenueLabel}</span>
                      <span className="text-[10.5px] font-semibold tabular-nums text-muted">{z.timeLabel}</span>
                      <span className={`text-[10.5px] font-bold tabular-nums ${z.deliveryColorClass}`}>{z.deliveryLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion title="Quality & risk" highlight={qualityHighlight} open={openSections.quality} onToggle={() => toggle("quality")}>
          <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {qualityTiles.map((t) => <MiniTile key={t.label} {...t} small />)}
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <div>
              <p className="mb-3 text-[12px] font-bold text-heading">Top complaint reasons</p>
              <div className="flex flex-col gap-2.5">
                {complaintReasons.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[12px] font-semibold text-body">{c.name}</span>
                      <span className="text-[11.5px] font-bold tabular-nums text-heading">{c.countLabel}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${c.barPct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[12px] font-bold text-heading">How they were resolved</p>
              <div className="flex flex-col">
                {resolutionsOut.map((r) => (
                  <div key={r.name} className="flex items-center justify-between border-b border-admin-row-border py-2">
                    <span className="text-[12px] font-semibold text-body">{r.name}</span>
                    <span className="text-[11.5px] font-bold tabular-nums text-heading">{r.countLabel} · {r.sharePct}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[10.5px] font-semibold leading-[1.45] text-muted">29Foods closes every complaint with food or store credit.</p>
            </div>
            <div>
              <p className="mb-3 text-[12px] font-bold text-heading">Promo code usage</p>
              <div className="flex flex-col gap-3">
                {promosOut.map((p) => (
                  <div key={p.code}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[12.5px] font-bold text-heading">{p.code}</span>
                      <span className="text-[11.5px] font-bold tabular-nums text-heading">{p.givenLabel}</span>
                    </div>
                    <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-warning" style={{ width: `${p.barPct}%` }} />
                    </div>
                    <p className="text-[10.5px] font-semibold tabular-nums text-muted">{p.usesLabel} · {p.sharePct}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Accordion>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Day view

function DayView({
  offset, setOffset, datePickerOpen, setDatePickerOpen, dateGroups, costsModalOpen, setCostsModalOpen,
}: {
  offset: number;
  setOffset: (fn: (o: number) => number) => void;
  datePickerOpen: boolean;
  setDatePickerOpen: (v: boolean) => void;
  dateGroups: { label: string; days: { offset: number; label: string; selected: boolean }[] }[];
  costsModalOpen: boolean;
  setCostsModalOpen: (v: boolean) => void;
}) {
  const [openSections, setOpenSections] = useState({ operations: true, finance: true, menu: false, customers: false, marketing: false });
  const toggle = (k: keyof typeof openSections) => setOpenSections((s) => ({ ...s, [k]: !s[k] }));

  const isToday = offset === 0;
  const isPast = offset > 0;

  const dayData = useMemo(() => dailyHistorical(offset), [offset]);

  const trendBars = useMemo(() => {
    const offsets: number[] = [];
    for (let o = 29; o >= 0; o--) offsets.push(o);
    const vals = offsets.map((o) => dailyHistorical(o).revenue);
    const max = Math.max(...vals, 1);
    return offsets.map((o, i) => ({ offset: o, height: Math.max(4, Math.round((vals[i]! / max) * 56)), selected: o === offset }));
  }, [offset]);

  const insightText = useMemo(() => {
    let sum = 0;
    for (let o = 1; o <= 30; o++) sum += dailyHistorical(o).revenue;
    const rollingAvg = sum / 30;
    const pctDiff = Math.round(((dayData.revenue - rollingAvg) / rollingAvg) * 100);
    if (isToday) {
      return pctDiff >= 0 ? `Today's revenue is running ${pctDiff}% above your 30-day average — a strong day so far.` : `Today's revenue is tracking ${Math.abs(pctDiff)}% below your 30-day average.`;
    }
    const sameWeekdayOffsets = [7, 14, 21, 28].map((d) => offset + d).filter((o) => o <= 44);
    const sameWeekdayVals = sameWeekdayOffsets.map((o) => dailyHistorical(o).revenue);
    const isBest = sameWeekdayVals.length > 0 && dayData.revenue >= Math.max(...sameWeekdayVals);
    if (isBest && sameWeekdayVals.length >= 2) return `This was your best ${fmtShort(offset).split(",")[0]} for revenue in the last ${sameWeekdayVals.length + 1} weeks.`;
    return pctDiff >= 0 ? `Revenue that day was ${pctDiff}% above the 30-day rolling average.` : `Revenue that day was ${Math.abs(pctDiff)}% below the 30-day rolling average.`;
  }, [offset, isToday, dayData.revenue]);

  const report = useMemo(() => buildDayReport(offset, dayData.f, dayData.orders, dayData.aov, dayData.repeatPct), [offset, dayData]);

  return (
    <div>
      <div className="relative mb-4 flex items-center justify-between rounded-[14px] border border-border bg-card px-3.5 py-2.5">
        <button onClick={() => setOffset((o) => Math.min(44, o + 1))} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-bold text-heading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          <span className="hidden sm:inline">Yesterday</span>
        </button>
        <div className="relative">
          <button onClick={() => setDatePickerOpen(!datePickerOpen)} className="flex items-center gap-1.5 rounded-lg bg-accent-tint px-3.5 py-[7px] text-[13px] font-bold text-admin-nav-active">
            <span className="lg:hidden">{fmtShort(offset)}</span>
            <span className="hidden lg:inline">{fmtHeader(offset)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {datePickerOpen && (
            <>
              <div onClick={() => setDatePickerOpen(false)} className="fixed inset-0 z-[39]" />
              <div className="scrollbar-none absolute left-1/2 top-10 z-40 w-[220px] max-h-[320px] -translate-x-1/2 overflow-y-auto rounded-xl2 border border-border bg-card p-2 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
                {dateGroups.map((g) => (
                  <div key={g.label} className="px-2 pb-0.5 pt-1.5">
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-muted">{g.label}</p>
                    {g.days.map((dd) => (
                      <div
                        key={dd.offset}
                        onClick={() => {
                          setOffset(() => dd.offset);
                          setDatePickerOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg px-2.5 py-2 text-[12.5px] ${dd.selected ? "bg-accent-tint font-bold text-admin-nav-active" : "font-semibold text-heading"}`}
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
        {isToday ? (
          <div className="w-[90px]" />
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setOffset(() => 0)} className="rounded-lg bg-accent-tint px-3 py-1.5 text-[11.5px] font-bold text-admin-nav-active">Today</button>
            <button onClick={() => setOffset((o) => Math.max(0, o - 1))} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-bold text-heading">
              <span className="hidden sm:inline">Tomorrow</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        )}
      </div>

      {isPast && (
        <div className="mb-3 flex items-center gap-1.5 lg:hidden">
          <span className="rounded-full bg-border px-2.5 py-[3px] text-[10px] font-bold text-muted">Historical view — read only</span>
          <button onClick={() => setOffset(() => 0)} className="text-[10.5px] font-bold text-accent">Jump to Today</button>
        </div>
      )}

      <div className="mb-[18px] rounded-2xl border border-border bg-card p-5">
        <p className="mb-2.5 text-[13px] font-bold text-heading">Daily revenue — last 30 days</p>
        <div className="flex h-[60px] items-end gap-1">
          {trendBars.map((b) => (
            <div key={b.offset} className={`flex-1 rounded-t-[3px] rounded-b-[1px] ${b.selected ? "border border-accent bg-accent" : "bg-border"}`} style={{ height: `${b.height}px` }} />
          ))}
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2.5 rounded-xl2 border border-admin-danger-border bg-admin-danger p-3.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M13 2 3 14h8l-1 8 11-14h-9l1-6Z" /></svg>
        <span className="text-[12.5px] font-semibold leading-[1.5] text-heading">{insightText}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
        <StatCard label="Revenue" value={fN(dayData.revenue)} />
        <StatCard label="Orders" value={String(dayData.orders)} />
        <StatCard label="Avg order value" value={fN(dayData.aov)} />
        <StatCard label="Repeat rate" value={`${dayData.repeatPct}%`} />
      </div>

      <div className="mt-5 flex flex-col gap-3.5">
        <Accordion title="Operations" highlight={`${report.presentCount} of ${report.staffPresent.length} staff present · ${report.totalDeliveries} deliveries · ${report.onTimePct}% on time`} open={openSections.operations} onToggle={() => toggle("operations")}>
          <p className="mb-2.5 text-[12px] font-bold text-heading">Staff present today — {report.presentCount} of {report.staffPresent.length}</p>
          <div className="mb-4 flex flex-col gap-2">
            {report.staffPresent.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-[10px] bg-admin-row-hover px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent-tint text-[11px] font-extrabold text-admin-nav-active">{s.initial}</span>
                  <div>
                    <div className="text-[12.5px] font-bold text-heading">{s.name}</div>
                    <div className="text-[10.5px] text-muted">{s.role}</div>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${s.present ? "bg-success-bg text-success" : "bg-border text-muted"}`}>{s.present ? "Present" : "Off today"}</span>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-[12px] font-bold text-heading">Deliveries</span>
            <span className="text-[11.5px] font-bold text-heading">{report.totalDeliveries} completed · {report.onTimePct}% on time</span>
          </div>
          <div className="mb-4 flex flex-col">
            {report.riderSummary.map((r) => (
              <div key={r.name} className="flex items-center justify-between border-b border-admin-row-border py-1.5">
                <span className="text-[12px] font-semibold text-heading">{r.name}</span>
                <span className="text-[11.5px] tabular-nums text-muted">{r.deliveries} delivered · {r.onTimeCount} on time</span>
              </div>
            ))}
          </div>

          <p className="mb-2.5 text-[12px] font-bold text-heading">Portions</p>
          <div className="mb-3 grid grid-cols-3 gap-2.5">
            <MiniStatSmall label="Cooked" value={String(report.totalCooked)} />
            <MiniStatSmall label="Sold" value={String(report.totalSold)} />
            <MiniStatSmall label="Remaining/wasted" value={String(report.totalWasted)} />
          </div>
          {report.soldOutDishes.length > 0 ? (
            <>
              <p className="mb-1.5 text-[11px] font-bold text-muted">Sold out today</p>
              <div className="flex flex-col gap-1.5">
                {report.soldOutDishes.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-heading">{d.name}</span>
                    <span className="text-[11px] font-bold text-accent">Sold out {d.time}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <span className="text-[11.5px] text-muted">No dishes sold out today.</span>
          )}
        </Accordion>

        <Accordion title="Finance & costs" highlight={`Net for the day: ${fN(report.netForDay)}`} highlightColorClass={report.netForDay >= 0 ? "text-success" : "text-accent"} open={openSections.finance} onToggle={() => toggle("finance")}>
          <p className="mb-2.5 text-[12px] font-bold text-heading">Revenue breakdown</p>
          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <MiniStatSmall label="Delivery orders" value={fN(report.deliveryRevenue)} />
            <MiniStatSmall label="Walk-in / Cashier" value={fN(report.walkInRevenue)} />
          </div>

          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[12px] font-bold text-heading">Daily operating costs</span>
            <button onClick={() => setCostsModalOpen(true)} className="rounded-lg bg-accent-tint px-3 py-1.5 text-[11.5px] font-bold text-admin-nav-active">Log today&rsquo;s costs</button>
          </div>
          <div className="mb-4 flex flex-col gap-1.5">
            <CostLine label="Gas / fuel" value={fN(report.gasFuel)} />
            <CostLine label="Electricity" value={fN(report.electricity)} />
            <CostLine label="Staff wages (today)" value={fN(report.staffWages)} />
            <CostLine label="Market / ingredient purchases" value={fN(report.marketPurchases)} />
            <CostLine label="Miscellaneous" value={fN(report.misc)} />
            <div className="h-px bg-border" />
            <CostLine label="Total costs today" value={fN(report.totalCosts)} bold />
            <div className={`mt-1 flex items-center justify-between rounded-lg px-2.5 py-2 ${report.netForDay >= 0 ? "bg-success-bg" : "bg-admin-danger"}`}>
              <span className="text-[12.5px] font-bold text-heading">Net for the day</span>
              <span className={`text-[14px] font-extrabold tabular-nums ${report.netForDay >= 0 ? "text-success" : "text-accent"}`}>{fN(report.netForDay)}</span>
            </div>
          </div>

          <p className="mb-2.5 text-[12px] font-bold text-heading">Market purchases today</p>
          <div className="flex flex-col gap-1.5">
            {report.marketItems.map((m) => <CostLine key={m.label} label={m.label} value={fN(m.amount)} />)}
          </div>
        </Accordion>

        <Accordion title="Menu & inventory" highlight={`Today's best seller: ${report.bestSellerToday.name} (${report.bestSellerToday.sold} orders)`} open={openSections.menu} onToggle={() => toggle("menu")}>
          <div className="mb-1.5 grid grid-cols-2 gap-2.5">
            <MiniStatSmall label="Today's best seller" value={report.bestSellerToday.name} />
            <MiniStatSmall label="All-time best seller" value="Party Jollof" />
          </div>
          {report.bestSellerToday.name !== "Party Jollof" && <p className="mb-4 text-[11.5px] font-semibold text-warning">Different from usual — worth noting.</p>}

          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[12px] font-bold text-heading">Stock needing attention</span>
            <span className={`text-[11.5px] font-bold ${report.stockValueChange >= 0 ? "text-success" : "text-accent"}`}>{report.stockValueChange >= 0 ? "+" : ""}{fN(report.stockValueChange)} stock value</span>
          </div>
          <div className="mb-4 flex flex-col gap-1.5">
            {report.lowStockItems.map((name) => (
              <div key={name} className="flex items-center justify-between rounded-lg bg-warning/10 px-2.5 py-2">
                <span className="text-[12px] font-semibold text-heading">{name}</span>
                <span className="text-[10.5px] font-bold text-warning">LOW</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <MiniStatSmall label="Meal plan orders fulfilled" value={String(report.mealPlansFulfilled)} />
            <MiniStatSmall label="New meal plans purchased" value={String(report.newMealPlansPurchased)} />
          </div>
        </Accordion>

        <Accordion title="Customers & feedback" highlight={`${report.newCustomers} new · ${report.returningCustomers} returning customers today`} open={openSections.customers} onToggle={() => toggle("customers")}>
          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <MiniStatSmall label="New customers" value={String(report.newCustomers)} />
            <MiniStatSmall label="Returning customers" value={String(report.returningCustomers)} />
          </div>

          <p className="mb-2.5 text-[12px] font-bold text-heading">Feedback themes</p>
          <div className="mb-4 flex flex-col gap-1.5">
            {report.feedbackThemes.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full bg-muted" />
                <span className="text-[12px] font-semibold leading-[1.5] text-body">{t}</span>
              </div>
            ))}
          </div>

          <p className="mb-2.5 text-[12px] font-bold text-heading">Sentiment today</p>
          <div className="flex flex-wrap items-center gap-4">
            <Sentiment color="bg-success" count={report.sentimentGood} label="positive" />
            <Sentiment color="bg-warning" count={report.sentimentNeutral} label="neutral" />
            <Sentiment color="bg-accent" count={report.sentimentBad} label="negative" />
          </div>
        </Accordion>

        <Accordion title="Marketing" highlight={`${report.promosToday.reduce((n, p) => n + p.uses, 0)} promo redemptions today`} open={openSections.marketing} onToggle={() => toggle("marketing")}>
          <p className="mb-2.5 text-[12px] font-bold text-heading">Promo codes used today</p>
          <div className="mb-4 flex flex-col gap-2">
            {report.promosToday.map((p) => (
              <div key={p.code} className="flex items-center justify-between border-b border-admin-row-border pb-2">
                <span className="text-[12.5px] font-bold text-heading">{p.code}</span>
                <div className="text-right">
                  <div className="text-[12px] font-bold text-heading">{p.uses}× today</div>
                  <div className="text-[10.5px] text-muted">{fN(p.given)} given</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mb-2.5 text-[12px] font-bold text-heading">Delivery zone performance today</p>
          <div className="flex flex-col gap-2">
            {report.zonePerfToday.map((z) => (
              <div key={z.name} className="flex items-center justify-between border-b border-admin-row-border pb-2">
                <span className="text-[12.5px] font-semibold text-heading">{z.name}</span>
                <div className="text-right">
                  <div className="text-[12.5px] font-bold text-heading">{z.orders} orders</div>
                  <div className="text-[11px] text-muted">{fN(z.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </Accordion>
      </div>

      {costsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCostsModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[460px] rounded-[20px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="mb-[18px] flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-heading">Log today&rsquo;s costs</h3>
              <button onClick={() => setCostsModalOpen(false)} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-5 flex flex-col gap-3.5">
              <div className="flex gap-3">
                <div className="flex-1"><ModalField label="Gas / fuel (₦)" defaultValue={String(report.gasFuel)} /></div>
                <div className="flex-1"><ModalField label="Electricity (₦)" defaultValue={String(report.electricity)} /></div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><ModalField label="Staff wages (₦)" defaultValue={String(report.staffWages)} /></div>
                <div className="flex-1"><ModalField label="Market purchases (₦)" defaultValue={String(report.marketPurchases)} /></div>
              </div>
              <ModalField label="Miscellaneous (₦)" defaultValue={String(report.misc)} />
            </div>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setCostsModalOpen(false)} className="px-3.5 py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
              <button onClick={() => setCostsModalOpen(false)} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">Save costs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- Shared bits

function MetricTile({ label, value, sub, d }: { label: string; value: string; sub: string; d: { text: string; colorClass: string } }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className="text-[19px] font-extrabold tabular-nums text-heading lg:text-[21px]">{value}</p>
      <p className="mt-0.5 text-[10.5px] font-semibold tabular-nums text-muted">{sub}</p>
      <p className={`mt-1.5 text-[11px] font-bold tabular-nums ${d.colorClass}`}>{d.text}</p>
    </div>
  );
}
function MiniTile({ label, value, sub, d, small }: { label: string; value: string; sub: string; d: { text: string; colorClass: string }; small?: boolean }) {
  return (
    <div className="rounded-xl2 bg-admin-row-hover p-3">
      <p className={`mb-1.5 font-bold uppercase tracking-[0.04em] text-muted ${small ? "text-[9.5px]" : "text-[10.5px]"}`}>{label}</p>
      <p className={`font-extrabold tabular-nums text-heading ${small ? "text-[16px]" : "text-[18px]"}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-muted">{sub}</p>
      <p className={`mt-1.5 text-[10.5px] font-bold tabular-nums ${d.colorClass}`}>{d.text}</p>
    </div>
  );
}
function MiniStatSmall({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-admin-row-hover p-2.5">
      <p className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.04em] text-muted">{label}</p>
      <p className="text-[15px] font-extrabold text-heading">{value}</p>
    </div>
  );
}
function CostLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-[12px] ${bold ? "font-bold text-heading" : "font-semibold text-body"}`}>{label}</span>
      <span className={`text-[12px] ${bold ? "font-extrabold text-heading" : "font-bold text-heading"}`}>{value}</span>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
function Sentiment({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-[9px] w-[9px] rounded-full ${color}`} />
      <span className="text-[12px] font-bold text-heading">{count}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </span>
  );
}
function ModalField({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</label>
      <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
        <input defaultValue={defaultValue} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />
      </div>
    </div>
  );
}
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className="text-[19px] font-extrabold tabular-nums text-heading lg:text-[23px]">{value}</p>
    </div>
  );
}

function Accordion({
  title, highlight, highlightColorClass, open, onToggle, children,
}: {
  title: string;
  highlight: string;
  highlightColorClass?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--admin-nav-active-text)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="9" /></svg>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-heading">{title}</div>
          <div className={`mt-0.5 truncate text-[11.5px] font-semibold tabular-nums ${highlightColorClass ?? "text-muted"}`}>{highlight}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="border-t border-border p-4">
          {children}
        </div>
      )}
    </div>
  );
}
