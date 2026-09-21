import { DELIVERY_FEE_KOBO } from "./pricing";

export type MealTime = "breakfast" | "lunch" | "dinner";
export type DurationId = "1_week" | "2_weeks" | "1_month";

export interface PlanDuration {
  id: DurationId;
  numWeeks: number;
  label: string;
  badge: string | null;
}

export const PLAN_DURATIONS: PlanDuration[] = [
  { id: "1_week", numWeeks: 1, label: "1 Week", badge: "MOST POPULAR" },
  { id: "2_weeks", numWeeks: 2, label: "2 Weeks", badge: null },
  { id: "1_month", numWeeks: 4, label: "1 Month", badge: "BEST VALUE" },
];

export interface PlanDish {
  key: string;
  name: string;
  priceKobo: number;
  /** Matches a key in lib/menu-images.ts (apps/web) when the dish has a photo. */
  imageName: string | null;
}

export const PLAN_DISH_CATALOG: Record<MealTime, PlanDish[]> = {
  breakfast: [
    { key: "bread_egg", name: "Bread & Egg", priceKobo: 90000, imageName: null },
    { key: "yam_porridge", name: "Yam Porridge", priceKobo: 110000, imageName: null },
    { key: "oats_fruit", name: "Oats & Fruit", priceKobo: 85000, imageName: null },
  ],
  lunch: [
    { key: "ofada_special", name: "Ofada Special", priceKobo: 180000, imageName: "Ofada Special" },
    { key: "garlic_fried_rice", name: "Garlic Fried Rice", priceKobo: 170000, imageName: "Garlic Fried Rice" },
    { key: "egg_sauce_rice", name: "Egg Sauce & Rice", priceKobo: 130000, imageName: null },
  ],
  dinner: [
    { key: "party_jollof_chicken", name: "Party Jollof + Chicken", priceKobo: 190000, imageName: "Party Jollof" },
    { key: "peppered_chicken", name: "Peppered Chicken", priceKobo: 160000, imageName: "Peppered Chicken" },
    { key: "native_jollof", name: "Native Jollof", priceKobo: 175000, imageName: "Native Jollof" },
  ],
};

export interface PlanAddon {
  label: string;
  priceKobo: number;
}

export const PLAN_SLOT_ADDONS: Record<MealTime, PlanAddon> = {
  breakfast: { label: "Fried egg", priceKobo: 25000 },
  lunch: { label: "Extra protein", priceKobo: 40000 },
  dinner: { label: "Chilled drink", priceKobo: 30000 },
};

export const MAX_FREQUENCY_PER_SLOT = 7;

export interface PlanSlotDishInput {
  dishKey: string;
  frequencyPerWeek: number;
}

export interface PlanSlotInput {
  mealTime: MealTime;
  enabled: boolean;
  addonEnabled: boolean;
  dishes: PlanSlotDishInput[];
}

export interface PlanPricing {
  weeklyFood: number;
  foodSubtotal: number;
  deliveriesPerWeek: number;
  deliveries: number;
  deliveryTotal: number;
  grandTotal: number;
  hasAnyMeal: boolean;
}

function findDish(mealTime: MealTime, dishKey: string): PlanDish | undefined {
  return PLAN_DISH_CATALOG[mealTime].find((d) => d.key === dishKey);
}

/** Authoritative pricing engine — used both for the live PlanSetup UI and server-side re-derivation. */
export function computeSubscriptionPricing(slots: PlanSlotInput[], numWeeks: number): PlanPricing {
  let weeklyFood = 0;
  let deliveriesPerWeek = 0;
  let hasAnyMeal = false;

  for (const slot of slots) {
    if (!slot.enabled) continue;
    const slotTotalFreq = slot.dishes.reduce((sum, d) => sum + d.frequencyPerWeek, 0);
    if (slotTotalFreq === 0) continue;
    hasAnyMeal = true;

    for (const dish of slot.dishes) {
      const catalogDish = findDish(slot.mealTime, dish.dishKey);
      if (!catalogDish) continue;
      weeklyFood += catalogDish.priceKobo * dish.frequencyPerWeek;
    }
    if (slot.addonEnabled) {
      weeklyFood += PLAN_SLOT_ADDONS[slot.mealTime].priceKobo * slotTotalFreq;
    }
    deliveriesPerWeek += slotTotalFreq;
  }

  const foodSubtotal = weeklyFood * numWeeks;
  const deliveries = deliveriesPerWeek * numWeeks;
  const deliveryTotal = deliveries * DELIVERY_FEE_KOBO;

  return { weeklyFood, foodSubtotal, deliveriesPerWeek, deliveries, deliveryTotal, grandTotal: foodSubtotal + deliveryTotal, hasAnyMeal };
}

/**
 * Deterministic, evenly-spread weekday assignment (0=Sun..6=Sat) for a given
 * weekly frequency, computed once at purchase time so the daily fulfillment
 * job never has to re-derive "which days" — it just checks today's weekday
 * against this array.
 */
export function assignWeekdays(frequencyPerWeek: number): number[] {
  if (frequencyPerWeek >= 7) return [0, 1, 2, 3, 4, 5, 6];
  const days = new Set<number>();
  for (let i = 0; i < frequencyPerWeek; i++) {
    days.add(Math.round((i * 7) / frequencyPerWeek) % 7);
  }
  return [...days].sort((a, b) => a - b);
}
