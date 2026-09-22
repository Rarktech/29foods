// Ported from AdminReportsWebDark.dc.html's Component class — the full range-analytics
// and end-of-day-report simulation engine, kept pure/deterministic (seeded) so every
// user sees identical numbers, matching the reference mockup's own behavior exactly.

export function seededRand(seed: number) {
  let a = seed | 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function dateForOffset(offset: number) {
  const d = new Date(2026, 8, 21);
  d.setDate(d.getDate() - offset);
  return d;
}
function isWeekendOffset(offset: number) {
  const day = dateForOffset(offset).getDay();
  return day === 0 || day === 5 || day === 6;
}
export function fmtShort(offset: number) {
  const d = dateForOffset(offset);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}
export function fmtHeader(offset: number) {
  if (offset === 0) return "Today — " + fmtShort(offset);
  if (offset === 1) return "Yesterday — " + fmtShort(offset);
  return fmtShort(offset);
}
export function dayFactor(offset: number, seedBase: number) {
  const rand = seededRand(seedBase + offset * 977);
  let f = 1.0;
  if (isWeekendOffset(offset)) f *= 1.18 + rand() * 0.12;
  else f *= 0.9 + rand() * 0.08;
  f *= 1 - offset * 0.0026;
  if (rand() < 0.08) f *= 0.6 + rand() * 0.15;
  return f;
}

export function fN(n: number) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}
export function fC(n: number) {
  const a = Math.abs(n);
  if (a >= 1000000) return "₦" + (n / 1000000).toFixed(2) + "M";
  if (a >= 1000) return "₦" + Math.round(n / 1000) + "k";
  return "₦" + Math.round(n);
}
export function pct1(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1) + "%";
}

export interface Delta {
  text: string;
  colorClass: string;
}
export function delta(cur: number, prev: number, days: number, opts: { unit?: "pts"; lowerBetter?: boolean } = {}): Delta {
  const label = `vs prev ${days}d`;
  if (!prev || !isFinite(prev)) return { text: "no prior period", colorClass: "text-muted" };
  const pts = opts.unit === "pts";
  const change = pts ? cur - prev : ((cur - prev) / Math.abs(prev)) * 100;
  const mag = Math.abs(change);
  if (mag < (pts ? 0.4 : 1.2)) return { text: `→ flat ${label}`, colorClass: "text-warning" };
  const arrow = change > 0 ? "↑" : "↓";
  const shown = pts ? mag.toFixed(1) + " pts" : mag.toFixed(1) + "%";
  const good = opts.lowerBetter ? change < 0 : change > 0;
  return { text: `${arrow} ${shown} ${label}`, colorClass: good ? "text-success" : "text-accent" };
}

// ---------------- Range (period) analytics ----------------

const DISH_BASE = [
  { name: "Party Jollof", price: 1800, base: 14, trend: 0.0012, cat: "Rice dishes" },
  { name: "Native Jollof", price: 1700, base: 10, trend: 0.0004, cat: "Rice dishes" },
  { name: "Ofada Special", price: 2200, base: 8, trend: 0.0018, cat: "Rice dishes" },
  { name: "Garlic Fried Rice", price: 2000, base: 7, trend: 0.0031, cat: "Rice dishes" },
  { name: "Grilled Chicken", price: 1600, base: 15, trend: 0.0009, cat: "Proteins & add-ons" },
  { name: "Peppered Chicken", price: 1500, base: 11, trend: 0.0002, cat: "Proteins & add-ons" },
  { name: "Assorted Meat Dish", price: 2500, base: 6, trend: -0.0008, cat: "Proteins & add-ons" },
  { name: "Pounded Yam & Egusi", price: 2300, base: 5, trend: -0.0014, cat: "Swallow dishes" },
  { name: "Semo & Ogbono", price: 2200, base: 4, trend: -0.0026, cat: "Swallow dishes" },
];
const ZONE_BASE = [
  { name: "Peace Lodge", share: 0.46, cost: 210, fee: 300, time: 21 },
  { name: "Hilltop Hostel", share: 0.3, cost: 265, fee: 350, time: 27 },
  { name: "Unity Hall", share: 0.16, cost: 300, fee: 400, time: 25 },
  { name: "Off-campus", share: 0.08, cost: 620, fee: 450, time: 38 },
];
const RIDER_BASE = [
  { name: "Sadiq Musa", share: 0.3, onTime: 0.94 },
  { name: "Blessing Uche", share: 0.24, onTime: 0.89 },
  { name: "Kelechi Obi", share: 0.26, onTime: 0.91 },
  { name: "Tochukwu Eze", share: 0.2, onTime: 0.83 },
];
const COMPLAINT_REASONS = ["Late delivery", "Food arrived cold", "Wrong item sent", "Portion too small", "Missing add-on"];
const RESOLUTIONS = ["Replacement sent", "Store credit", "Apology + free add-on", "Escalated to rider", "Resolved — no action", "Under review"];

interface RangeDay {
  dishes: { name: string; cat: string; price: number; units: number; cooked: number; soldOut: boolean; revenue: number }[];
  zones: { name: string; orders: number; fee: number; cost: number; time: number; feeTotal: number; costTotal: number; timeSum: number; revenue: number }[];
  riders: { name: string; deliveries: number; onTime: number }[];
  promos: { code: string; uses: number; given: number }[];
  reasons: number[];
  resolutions: number[];
  foodRev: number; drinksRev: number; planRev: number; deliveryFees: number; gross: number; discount: number; revenue: number;
  deliveryRevenue: number; walkInRevenue: number; orders: number; deliveryOrders: number; walkInOrders: number;
  unitsTotal: number; cookedTotal: number; wasted: number;
  foodCost: number; wages: number; gas: number; electricity: number; misc: number; deliveryCost: number; totalCosts: number;
  grossProfit: number; netProfit: number;
  unique: number; newCust: number; returningCust: number; repeatOrders: number;
  planNew: number; planRenewed: number; planLapsed: number; planActive: number;
  prepTime: number; deliveryTime: number; onTimeDeliveries: number; complaints: number; addonOrders: number;
}

const rangeCache = new Map<number, RangeDay>();

function rangeDay(o: number): RangeDay {
  const cached = rangeCache.get(o);
  if (cached) return cached;
  const rand = seededRand(31000 + o * 8191);
  const dt = dateForOffset(o);
  const dow = dt.getDay();
  const weekend = dow === 0 || dow === 5 || dow === 6;
  let f = (1 - o * 0.002) * (1 + 0.06 * Math.sin(o / 11.3)) * (weekend ? 1.16 : 0.94) * (0.94 + rand() * 0.12);
  if (rand() < 0.06) f *= 0.72;
  if (f < 0.3) f = 0.3;

  const wasteDrift = 1 + o * 0.00045;
  const dishes = DISH_BASE.map((d, i) => {
    const dr = seededRand(32000 + o * 733 + i * 1301);
    let tf = 1 - o * d.trend;
    if (tf < 0.35) tf = 0.35;
    const demand = d.base * f * tf * (0.82 + dr() * 0.36);
    const cooked = Math.max(3, Math.round(demand * (1.02 + dr() * 0.07) * wasteDrift));
    const rush = dr() < 0.11 ? 1.28 : 1.0;
    const realised = Math.max(1, Math.round(demand * (0.94 + dr() * 0.13) * rush));
    const soldOut = realised > cooked;
    const units = Math.min(realised, cooked);
    return { name: d.name, cat: d.cat, price: d.price, units, cooked, soldOut, revenue: units * d.price };
  });
  const foodRev = dishes.reduce((a, d) => a + d.revenue, 0);
  const unitsTotal = dishes.reduce((a, d) => a + d.units, 0);
  const cookedTotal = dishes.reduce((a, d) => a + d.cooked, 0);
  const wasted = Math.max(0, cookedTotal - unitsTotal);

  const drinksRev = Math.round(foodRev * (0.068 + rand() * 0.036));
  const planRev = Math.round(foodRev * (0.115 + rand() * 0.055));

  const orders = Math.max(6, Math.round(unitsTotal / (1.7 + rand() * 0.16)));
  const walkInOrders = Math.min(orders - 1, Math.max(0, Math.round(orders * (0.15 + rand() * 0.07))));
  const deliveryOrders = Math.max(1, orders - walkInOrders);

  let left = deliveryOrders;
  const zones = ZONE_BASE.map((z, i) => {
    const zr = seededRand(33000 + o * 617 + i * 911);
    const n = i === ZONE_BASE.length - 1 ? Math.max(0, left) : Math.min(left, Math.max(0, Math.round(deliveryOrders * z.share * (0.86 + zr() * 0.28))));
    left -= n;
    const fee = Math.round(z.fee * (0.92 + zr() * 0.16));
    const cost = Math.round(z.cost * (0.9 + zr() * 0.2));
    const time = (z.time + o * 0.022) * (0.9 + zr() * 0.2);
    return { name: z.name, orders: n, fee, cost, time, feeTotal: fee * n, costTotal: cost * n, timeSum: time * n, revenue: 0 };
  });
  const deliveryFees = zones.reduce((a, z) => a + z.feeTotal, 0);
  const deliveryCost = zones.reduce((a, z) => a + z.costTotal, 0);

  const gross = foodRev + drinksRev + planRev + deliveryFees;
  const aovGuess = gross / Math.max(1, orders);
  const pr = seededRand(34000 + o * 457);
  const promosRaw = [
    { code: "WELCOME10", uses: Math.max(0, Math.round(orders * (0.11 + pr() * 0.07))), per: Math.round(aovGuess * 0.1) },
    { code: "EXAMWEEK", uses: Math.max(0, Math.round(orders * (0.07 + pr() * 0.06))), per: 500 },
    { code: "PEACELODGE", uses: Math.max(0, Math.round(orders * (0.06 + pr() * 0.05))), per: Math.round(aovGuess * 0.15) },
  ];
  const promos = promosRaw.map((p) => ({ code: p.code, uses: p.uses, given: p.uses * p.per }));
  const discount = promos.reduce((a, p) => a + p.given, 0);
  const revenue = Math.max(1, gross - discount);

  const walkInRevenue = Math.round(revenue * (walkInOrders / Math.max(1, orders)) * 0.7);
  const deliveryRevenue = revenue - walkInRevenue;
  zones.forEach((z) => {
    z.revenue = Math.round(deliveryRevenue * (z.orders / Math.max(1, deliveryOrders)));
  });

  const cr = seededRand(35000 + o * 389);
  const foodPct = 0.372 + o * 0.00042 + cr() * 0.024;
  const foodCost = Math.round(revenue * foodPct);
  const wages = Math.round((26000 + cr() * 7000 + (weekend ? 5200 : 0)) / 100) * 100;
  const gas = Math.round((6200 + cr() * 3200) / 100) * 100;
  const electricity = Math.round((3600 + cr() * 2400) / 100) * 100;
  const misc = Math.round((16000 + cr() * 8000) / 100) * 100;
  const totalCosts = foodCost + wages + gas + electricity + misc + deliveryCost;

  const cu = seededRand(36000 + o * 271);
  const unique = Math.max(3, Math.round(orders * (0.92 + cu() * 0.06)));
  const newShare = Math.min(0.62, 0.3 + o * 0.00035 + cu() * 0.06);
  const newCust = Math.max(1, Math.round(unique * newShare));
  const returningCust = Math.max(0, unique - newCust);
  const repeatOrders = Math.max(0, orders - newCust);

  const mp = seededRand(37000 + o * 353);
  const planNew = Math.max(0, Math.round(1.5 * f * (0.5 + mp() * 1.1)));
  const planRenewed = Math.max(0, Math.round(1.3 * f * (0.5 + mp() * 1.1)));
  const planLapsed = Math.max(0, Math.round(0.95 * (0.5 + mp() * 1.2)));
  const planActive = Math.max(20, Math.round(96 - o * 0.28 + (mp() - 0.5) * 6));

  const tt = seededRand(38000 + o * 199);
  const prepTime = 16.5 + o * 0.028 + tt() * 3.2;
  const deliveryTime = zones.reduce((a, z) => a + z.timeSum, 0) / Math.max(1, deliveryOrders);
  const onTimeBase = Math.max(0.55, 0.925 - o * 0.00055 - tt() * 0.07);
  let rLeft = deliveryOrders;
  const riders = RIDER_BASE.map((r, i) => {
    const rr = seededRand(39000 + o * 149 + i * 577);
    const n = i === RIDER_BASE.length - 1 ? Math.max(0, rLeft) : Math.min(rLeft, Math.max(0, Math.round(deliveryOrders * r.share * (0.85 + rr() * 0.3))));
    rLeft -= n;
    const rate = Math.max(0.5, Math.min(0.99, r.onTime * (onTimeBase / 0.9) * (0.96 + rr() * 0.08)));
    return { name: r.name, deliveries: n, onTime: Math.min(n, Math.round(n * rate)) };
  });
  const onTimeDeliveries = riders.reduce((a, r) => a + r.onTime, 0);

  const cq = seededRand(40000 + o * 131);
  const complaints = Math.max(0, Math.round(orders * (0.016 + o * 0.00009 + cq() * 0.022)));
  const reasonW = [0.34, 0.24, 0.17, 0.15, 0.1];
  const resW = [0.3, 0.24, 0.18, 0.14, 0.1, 0.04];
  const reasons = COMPLAINT_REASONS.map(() => 0);
  const resolutions = RESOLUTIONS.map(() => 0);
  const pick = (w: number[], r: number) => {
    let acc = 0;
    for (let k = 0; k < w.length; k++) {
      acc += w[k]!;
      if (r <= acc) return k;
    }
    return w.length - 1;
  };
  for (let c = 0; c < complaints; c++) {
    reasons[pick(reasonW, cq())]!++;
    resolutions[pick(resW, cq())]!++;
  }

  const ao = seededRand(41000 + o * 113);
  const addonOrders = Math.max(0, Math.min(orders, Math.round(orders * (0.36 - o * 0.00045 + ao() * 0.1))));

  const rec: RangeDay = {
    dishes, zones, riders, promos, reasons, resolutions,
    foodRev, drinksRev, planRev, deliveryFees, gross, discount, revenue,
    deliveryRevenue, walkInRevenue, orders, deliveryOrders, walkInOrders,
    unitsTotal, cookedTotal, wasted,
    foodCost, wages, gas, electricity, misc, deliveryCost, totalCosts,
    grossProfit: revenue - foodCost, netProfit: revenue - totalCosts,
    unique, newCust, returningCust, repeatOrders,
    planNew, planRenewed, planLapsed, planActive,
    prepTime, deliveryTime, onTimeDeliveries, complaints, addonOrders,
  };
  rangeCache.set(o, rec);
  return rec;
}

export function aggregateRange(startOffset: number, days: number) {
  const t = {
    days, revenue: 0, gross: 0, discount: 0, foodRev: 0, drinksRev: 0, planRev: 0, deliveryFees: 0,
    deliveryRevenue: 0, walkInRevenue: 0, orders: 0, deliveryOrders: 0, walkInOrders: 0,
    foodCost: 0, wages: 0, gas: 0, electricity: 0, misc: 0, deliveryCost: 0, totalCosts: 0,
    grossProfit: 0, netProfit: 0, cooked: 0, sold: 0, wasted: 0,
    newCust: 0, returningCust: 0, repeatOrders: 0, unique: 0,
    planNew: 0, planRenewed: 0, planLapsed: 0,
    prepWeighted: 0, deliveryTimeWeighted: 0, deliveries: 0, onTimeDeliveries: 0,
    complaints: 0, addonOrders: 0,
  };
  const dishes = DISH_BASE.map((d) => ({ name: d.name, cat: d.cat, price: d.price, units: 0, cooked: 0, revenue: 0, soldOutDays: 0 }));
  const zones = ZONE_BASE.map((z) => ({ name: z.name, orders: 0, revenue: 0, feeTotal: 0, costTotal: 0, timeSum: 0 }));
  const riders = RIDER_BASE.map((r) => ({ name: r.name, deliveries: 0, onTime: 0 }));
  const promos = ["WELCOME10", "EXAMWEEK", "PEACELODGE"].map((c) => ({ code: c, uses: 0, given: 0 }));
  const reasons = COMPLAINT_REASONS.map((n) => ({ name: n, count: 0 }));
  const resolutions = RESOLUTIONS.map((n) => ({ name: n, count: 0 }));

  for (let k = 0; k < days; k++) {
    const d = rangeDay(startOffset + k);
    t.revenue += d.revenue; t.gross += d.gross; t.discount += d.discount;
    t.foodRev += d.foodRev; t.drinksRev += d.drinksRev; t.planRev += d.planRev;
    t.deliveryFees += d.deliveryFees;
    t.deliveryRevenue += d.deliveryRevenue; t.walkInRevenue += d.walkInRevenue;
    t.orders += d.orders; t.deliveryOrders += d.deliveryOrders; t.walkInOrders += d.walkInOrders;
    t.foodCost += d.foodCost; t.wages += d.wages; t.gas += d.gas;
    t.electricity += d.electricity; t.misc += d.misc; t.deliveryCost += d.deliveryCost;
    t.totalCosts += d.totalCosts; t.grossProfit += d.grossProfit; t.netProfit += d.netProfit;
    t.cooked += d.cookedTotal; t.sold += d.unitsTotal; t.wasted += d.wasted;
    t.newCust += d.newCust; t.returningCust += d.returningCust;
    t.repeatOrders += d.repeatOrders; t.unique += d.unique;
    t.planNew += d.planNew; t.planRenewed += d.planRenewed; t.planLapsed += d.planLapsed;
    t.prepWeighted += d.prepTime * d.orders;
    t.deliveryTimeWeighted += d.deliveryTime * d.deliveryOrders;
    t.deliveries += d.deliveryOrders; t.onTimeDeliveries += d.onTimeDeliveries;
    t.complaints += d.complaints; t.addonOrders += d.addonOrders;
    d.dishes.forEach((x, i) => {
      dishes[i]!.units += x.units; dishes[i]!.cooked += x.cooked; dishes[i]!.revenue += x.revenue;
      if (x.soldOut) dishes[i]!.soldOutDays += 1;
    });
    d.zones.forEach((x, i) => {
      zones[i]!.orders += x.orders; zones[i]!.revenue += x.revenue; zones[i]!.feeTotal += x.feeTotal;
      zones[i]!.costTotal += x.costTotal; zones[i]!.timeSum += x.timeSum;
    });
    d.riders.forEach((x, i) => { riders[i]!.deliveries += x.deliveries; riders[i]!.onTime += x.onTime; });
    d.promos.forEach((x, i) => { promos[i]!.uses += x.uses; promos[i]!.given += x.given; });
    d.reasons.forEach((c, i) => { reasons[i]!.count += c; });
    d.resolutions.forEach((c, i) => { resolutions[i]!.count += c; });
  }

  const aov = t.revenue / Math.max(1, t.orders);
  const revenuePerDay = t.revenue / Math.max(1, days);
  const grossMarginPct = (t.grossProfit / t.revenue) * 100;
  const netMarginPct = (t.netProfit / t.revenue) * 100;
  const costPerOrder = t.totalCosts / Math.max(1, t.orders);
  const profitPerOrder = t.netProfit / Math.max(1, t.orders);
  const deliveryCostPerOrder = t.deliveryCost / Math.max(1, t.deliveryOrders);
  const deliveryFeePerOrder = t.deliveryFees / Math.max(1, t.deliveryOrders);
  const foodCostPct = (t.foodCost / t.revenue) * 100;
  const labourPct = (t.wages / t.revenue) * 100;
  const discountPct = (t.discount / t.revenue) * 100;
  const wastePct = (t.wasted / Math.max(1, t.cooked)) * 100;
  const avgPrep = t.prepWeighted / Math.max(1, t.orders);
  const avgDelivery = t.deliveryTimeWeighted / Math.max(1, t.deliveries);
  const onTimePct = (t.onTimeDeliveries / Math.max(1, t.deliveries)) * 100;
  const repeatRate = (t.repeatOrders / Math.max(1, t.orders)) * 100;
  const attachRate = (t.addonOrders / Math.max(1, t.orders)) * 100;
  const complaintRate = (t.complaints / Math.max(1, t.orders)) * 100;
  const freq = 1.15 + days * 0.075;
  const distinctReturning = Math.round(t.repeatOrders / freq);
  const distinctCustomers = t.newCust + distinctReturning;
  const ordersPerCustomer = t.orders / Math.max(1, distinctCustomers);
  const deliveriesPerRider = t.deliveries / Math.max(1, riders.length);
  const planActiveEnd = rangeDay(startOffset).planActive;

  return {
    ...t, aov, revenuePerDay, grossMarginPct, netMarginPct, costPerOrder, profitPerOrder,
    deliveryCostPerOrder, deliveryFeePerOrder, foodCostPct, labourPct, discountPct, wastePct,
    avgPrep, avgDelivery, onTimePct, repeatRate, attachRate, complaintRate,
    distinctReturning, distinctCustomers, ordersPerCustomer, deliveriesPerRider, planActiveEnd,
    dishes, zones, riders, promos, reasons, resolutions,
  };
}
export type RangeAgg = ReturnType<typeof aggregateRange>;

// ---------------- Day (end-of-day close) report ----------------

const DAY_DISH_BASE = [
  { name: "Party Jollof", base: 60 }, { name: "Native Jollof", base: 45 }, { name: "Ofada Special", base: 40 },
  { name: "Garlic Fried Rice", base: 30 }, { name: "Grilled Chicken", base: 70 }, { name: "Peppered Chicken", base: 50 },
  { name: "Assorted Meat Dish", base: 25 }, { name: "Pounded Yam & Egusi", base: 20 }, { name: "Semo & Ogbono", base: 20 },
];
const DAY_RIDER_BASE = [
  { name: "Sadiq Musa", baseDeliveries: 11 }, { name: "Blessing Uche", baseDeliveries: 8 }, { name: "Kelechi Obi", baseDeliveries: 9 },
  { name: "Aminu Bello", baseDeliveries: 10 }, { name: "Tochukwu Eze", baseDeliveries: 7 }, { name: "Musa Danladi", baseDeliveries: 6 },
  { name: "Chiamaka Nnadi", baseDeliveries: 12 }, { name: "David Okon", baseDeliveries: 5 },
];
const STAFF_BASE = [
  { name: "Richard", role: "Owner", initial: "R" },
  { name: "Tolu Bankole", role: "Kitchen lead", initial: "T" },
  { name: "Sadiq Musa", role: "Rider coordinator", initial: "S" },
  { name: "Kemi Alao", role: "Support / Cashier", initial: "K" },
  { name: "Musa Danladi", role: "Rider", initial: "M" },
];

export function buildDayReport(offset: number, f: number, orders: number, aov: number, repeatPct: number) {
  let totalCooked = 0, totalSold = 0;
  const soldOutDishes: { name: string; time: string }[] = [];
  let bestSellerToday = { name: DAY_DISH_BASE[0]!.name, sold: -1 };
  DAY_DISH_BASE.forEach((d, idx) => {
    const dishRand = seededRand(4200 + offset * 977 + idx * 653);
    const cooked = Math.max(4, Math.round(d.base * f * (0.95 + dishRand() * 0.1)));
    let sold = Math.round(cooked * (0.5 + dishRand() * 0.55));
    if (sold > cooked) sold = cooked;
    const remaining = cooked - sold;
    if (remaining <= 0) {
      const hourRand = seededRand(6600 + offset * 311 + idx * 97);
      const hour = 18 + Math.floor(hourRand() * 4);
      const minute = Math.floor(hourRand() * 60);
      const h12 = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? "pm" : "am";
      soldOutDishes.push({ name: d.name, time: `${h12}:${String(minute).padStart(2, "0")}${ampm}` });
    }
    totalCooked += cooked; totalSold += sold;
    if (sold > bestSellerToday.sold) bestSellerToday = { name: d.name, sold };
  });
  const totalWasted = totalCooked - totalSold;

  const rf = dayFactor(offset, 9100);
  const riderDayRand = seededRand(10200 + offset * 173);
  const onTimePct = Math.max(55, Math.min(99, Math.round(88 * (0.95 + riderDayRand() * 0.1) - (1 - rf) * 20)));
  let totalDeliveries = 0, totalOnTime = 0;
  const riderSummary = DAY_RIDER_BASE.map((r) => {
    const deliveries = Math.max(0, Math.round(r.baseDeliveries * rf * (0.85 + riderDayRand() * 0.3)));
    const onTimeCount = Math.min(deliveries, Math.round(deliveries * (onTimePct / 100) * (0.9 + riderDayRand() * 0.2)));
    totalDeliveries += deliveries; totalOnTime += onTimeCount;
    return { name: r.name, deliveries, onTimeCount };
  });

  const staffRand = seededRand(11300 + offset * 211);
  const offIdx = Math.floor(staffRand() * STAFF_BASE.length);
  const staffPresent = STAFF_BASE.map((s, idx) => ({ ...s, present: idx !== offIdx }));
  const presentCount = staffPresent.filter((s) => s.present).length;

  const walkInRand = seededRand(12400 + offset * 227);
  const walkInPct = 0.14 + walkInRand() * 0.06;
  const revenue = Math.round(aov * orders);
  const walkInRevenue = Math.round(revenue * walkInPct);
  const deliveryRevenue = revenue - walkInRevenue;

  const costRand = seededRand(13500 + offset * 241);
  const gasFuel = Math.round((6000 + costRand() * 3000) / 100) * 100;
  const electricity = Math.round((3500 + costRand() * 2000) / 100) * 100;
  const staffWages = Math.round((18000 + costRand() * 4000 + presentCount * 1200) / 100) * 100;
  const marketPurchases = Math.round((28000 + costRand() * 22000) / 500) * 500;
  const misc = Math.round((1500 + costRand() * 2500) / 100) * 100;
  const totalCosts = gasFuel + electricity + staffWages + marketPurchases + misc;
  const netForDay = revenue - totalCosts;

  const marketRand = seededRand(14600 + offset * 257);
  const riceBags = 1 + Math.floor(marketRand() * 3);
  const chickenKg = 10 + Math.floor(marketRand() * 20);
  const drinkCrates = 1 + Math.floor(marketRand() * 4);
  const marketItems = [
    { label: `${riceBags} bag${riceBags > 1 ? "s" : ""} rice`, amount: riceBags * 22500 },
    { label: `${chickenKg}kg chicken`, amount: chickenKg * 1900 },
    { label: `${drinkCrates} crate${drinkCrates > 1 ? "s" : ""} soft drinks`, amount: drinkCrates * 7000 },
  ];

  const invRand = seededRand(15700 + offset * 263);
  const lowCount = 1 + Math.floor(invRand() * 2);
  const lowStockItems = ["Rice (bag, 50kg)", "Fresh pepper (kg)", "Garlic (kg)"].slice(0, lowCount);
  const stockValueChangeRand = seededRand(16800 + offset * 269);
  const stockValueChange = Math.round((-18000 + stockValueChangeRand() * 36000) / 500) * 500;

  const mealPlanRand = seededRand(17900 + offset * 271);
  const mealPlansFulfilled = Math.max(2, Math.round(9 * f * (0.85 + mealPlanRand() * 0.3)));
  const newMealPlansPurchased = Math.max(0, Math.round(2.4 * f * (0.6 + mealPlanRand() * 0.8)));

  const newCustomers = Math.max(1, Math.round(orders * (1 - repeatPct / 100) * (0.9 + seededRand(18100 + offset * 281)() * 0.2)));
  const returningCustomers = Math.max(0, orders - newCustomers);

  const feedbackRand = seededRand(19200 + offset * 283);
  const praiseDish = ["Garlic Fried Rice", "Ofada Special", "Grilled Chicken", "Party Jollof"][Math.floor(feedbackRand() * 4)]!;
  const praiseCount = 1 + Math.floor(feedbackRand() * 4);
  const hasComplaint = feedbackRand() < 0.55;
  const complaintResolutions = ["replacement", "store credit", "apology add-on", "escalation to rider"];
  const complaintResolution = complaintResolutions[Math.floor(feedbackRand() * complaintResolutions.length)]!;
  const complaintReasonsList = ["a late delivery", "a cold meal", "a wrong item"];
  const complaintReason = complaintReasonsList[Math.floor(feedbackRand() * complaintReasonsList.length)]!;

  const feedbackThemes = [`${praiseCount} customer${praiseCount > 1 ? "s" : ""} praised the ${praiseDish}`];
  feedbackThemes.push(hasComplaint ? `1 complaint about ${complaintReason} — resolved via ${complaintResolution}` : "No complaints logged today — a clean day for service quality");
  feedbackThemes.push(`${returningCustomers} returning customers ordered again today`);

  const sentimentGood = praiseCount + (hasComplaint ? 0 : 2);
  const sentimentNeutral = 1;
  const sentimentBad = hasComplaint ? 1 : 0;

  const promoBase = [
    { code: "WELCOME10", discount: "10% off" },
    { code: "EXAMWEEK", discount: "₦500 off" },
    { code: "PEACELODGE", discount: "15% off" },
  ];
  const promoRand = seededRand(20300 + offset * 293);
  const promosToday = promoBase.map((p) => {
    const uses = Math.max(0, Math.round(orders * 0.12 * (0.4 + promoRand() * 1.2)));
    const perUse = p.discount.includes("₦") ? parseInt(p.discount.replace(/[^0-9]/g, ""), 10) || 500 : Math.round(aov * (parseInt(p.discount, 10) / 100));
    return { code: p.code, uses, given: uses * perUse };
  });

  const zoneBase = [
    { name: "Peace Lodge", baseShare: 0.46 }, { name: "Hilltop Hostel", baseShare: 0.3 },
    { name: "Unity Hall", baseShare: 0.16 }, { name: "Off-campus", baseShare: 0.08 },
  ];
  const zoneRand = seededRand(21400 + offset * 307);
  let zoneOrdersLeft = deliveryRevenue > 0 ? orders : 0;
  const zonePerfToday = zoneBase.map((z, idx) => {
    const share = z.baseShare * (0.85 + zoneRand() * 0.3);
    const n = idx === zoneBase.length - 1 ? Math.max(0, zoneOrdersLeft) : Math.min(zoneOrdersLeft, Math.max(0, Math.round(orders * share)));
    zoneOrdersLeft -= n;
    const revenue = Math.round(deliveryRevenue * (n / Math.max(1, orders)));
    return { name: z.name, orders: n, revenue };
  });

  return {
    totalCooked, totalSold, totalWasted, soldOutDishes, bestSellerToday,
    riderSummary, totalDeliveries, totalOnTime, onTimePct,
    staffPresent, presentCount,
    walkInRevenue, deliveryRevenue,
    gasFuel, electricity, staffWages, marketPurchases, misc, totalCosts, netForDay,
    marketItems, lowStockItems, stockValueChange,
    mealPlansFulfilled, newMealPlansPurchased,
    newCustomers, returningCustomers,
    feedbackThemes, sentimentGood, sentimentNeutral, sentimentBad,
    promosToday, zonePerfToday,
  };
}
export type DayReport = ReturnType<typeof buildDayReport>;

export function dailyHistorical(o: number) {
  const f = dayFactor(o, 6100);
  const dayRand = seededRand(7200 + o * 151);
  const baseRevenue = 172000;
  const revenue = Math.round(baseRevenue * f);
  const orders = Math.max(6, Math.round(44 * f * (0.92 + dayRand() * 0.16)));
  const aov = Math.round(revenue / orders);
  const repeatPct = Math.max(38, Math.min(78, Math.round(62 * (0.9 + dayRand() * 0.2) - (1 - f) * 18)));
  return { revenue, orders, aov, repeatPct, f };
}
