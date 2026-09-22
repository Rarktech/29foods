export interface IngredientBase {
  id: string;
  name: string;
  unit: string;
  baseStock: number;
  reorderLevel: number;
  usedIn: string;
  unitCost: number;
}

export const INGREDIENT_BASE: IngredientBase[] = [
  { id: "rice", name: "Rice (bag, 50kg)", unit: "bags", baseStock: 2, reorderLevel: 3, usedIn: "Jollof, Native, Garlic Rice", unitCost: 45000 },
  { id: "chicken", name: "Chicken (kg)", unit: "kg", baseStock: 14, reorderLevel: 20, usedIn: "Grilled & Peppered Chicken", unitCost: 3200 },
  { id: "pepper", name: "Fresh pepper (kg)", unit: "kg", baseStock: 3, reorderLevel: 5, usedIn: "Ofada, Peppered Chicken", unitCost: 1800 },
  { id: "tomatoes", name: "Tomatoes (crate)", unit: "crates", baseStock: 6, reorderLevel: 4, usedIn: "Jollof, Ofada", unitCost: 12000 },
  { id: "oil", name: "Vegetable oil (25L)", unit: "L", baseStock: 18, reorderLevel: 10, usedIn: "All fried dishes", unitCost: 1100 },
  { id: "garlic", name: "Garlic (kg)", unit: "kg", baseStock: 4, reorderLevel: 2, usedIn: "Garlic Fried Rice", unitCost: 2400 },
  { id: "assortedMeat", name: "Assorted meat (kg)", unit: "kg", baseStock: 9, reorderLevel: 6, usedIn: "Ofada Special", unitCost: 4500 },
  { id: "peas", name: "Garden peas (kg)", unit: "kg", baseStock: 7, reorderLevel: 3, usedIn: "Native Jollof, Garlic Rice", unitCost: 2100 },
  { id: "drinks", name: "Soft drinks (crate)", unit: "crates", baseStock: 11, reorderLevel: 5, usedIn: "Fanta, drinks add-on", unitCost: 6500 },
];

export interface IngredientUsageDay {
  label: string;
  value: number;
}
export interface IngredientUsedInDish {
  name: string;
  rate: string;
  orders: number;
}
export interface IngredientDetailInfo {
  unit: string;
  avgDailyUse: number;
  /** Reference hardcodes this per-ingredient rather than deriving it from stock/avgDailyUse — set only where a literal reference value exists. */
  daysToStockoutLabel?: string;
  usageRaw: IngredientUsageDay[];
  supplier: string;
  lastRestockDate: string;
  lastRestockCost: string;
  lastRestockQty: string;
  usedInDishes: IngredientUsedInDish[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function usage(values: number[]): IngredientUsageDay[] {
  return DAYS.map((label, i) => ({ label, value: values[i]! }));
}

export const INGREDIENT_DETAILS: Record<string, IngredientDetailInfo> = {
  rice: {
    unit: "bags", avgDailyUse: 9, daysToStockoutLabel: "~2 days", usageRaw: usage([8, 6, 9, 7, 11, 14, 10]),
    supplier: "Eke-Ogboji Grains Market", lastRestockDate: "Sep 17, 2026", lastRestockCost: "₦92,000", lastRestockQty: "4 bags",
    usedInDishes: [
      { name: "Party Jollof", rate: "0.35 bags / 10 orders", orders: 96 },
      { name: "Native Jollof", rate: "0.3 bags / 10 orders", orders: 41 },
      { name: "Garlic Fried Rice", rate: "0.4 bags / 10 orders", orders: 31 },
      { name: "Ofada Special", rate: "0.32 bags / 10 orders", orders: 58 },
    ],
  },
  chicken: {
    unit: "kg", avgDailyUse: 5, usageRaw: usage([4, 5, 4, 6, 6, 7, 3]),
    supplier: "Sunrise Poultry Farm", lastRestockDate: "Sep 19, 2026", lastRestockCost: "₦64,000", lastRestockQty: "20 kg",
    usedInDishes: [
      { name: "Peppered Chicken", rate: "0.4 kg / 10 orders", orders: 44 },
      { name: "Grilled Chicken", rate: "0.35 kg / 10 orders", orders: 18 },
    ],
  },
  pepper: {
    unit: "kg", avgDailyUse: 1.2, usageRaw: usage([1, 1, 1.5, 1, 1.5, 2, 0.8]),
    supplier: "Eke-Ogboji Grains Market", lastRestockDate: "Sep 18, 2026", lastRestockCost: "₦9,000", lastRestockQty: "5 kg",
    usedInDishes: [
      { name: "Ofada Special", rate: "0.12 kg / 10 orders", orders: 58 },
      { name: "Peppered Chicken", rate: "0.15 kg / 10 orders", orders: 44 },
    ],
  },
  tomatoes: {
    unit: "crates", avgDailyUse: 0.9, usageRaw: usage([0.8, 0.9, 1, 0.7, 1.1, 1.3, 0.6]),
    supplier: "Eke-Ogboji Grains Market", lastRestockDate: "Sep 20, 2026", lastRestockCost: "₦72,000", lastRestockQty: "6 crates",
    usedInDishes: [
      { name: "Party Jollof", rate: "0.05 crate / 10 orders", orders: 96 },
      { name: "Ofada Special", rate: "0.04 crate / 10 orders", orders: 58 },
    ],
  },
  oil: {
    unit: "L", avgDailyUse: 2.5, usageRaw: usage([2, 2.5, 2, 3, 3, 3.5, 1.5]),
    supplier: "Abakaliki Oil Depot", lastRestockDate: "Sep 15, 2026", lastRestockCost: "₦19,800", lastRestockQty: "18 L",
    usedInDishes: [
      { name: "Garlic Fried Rice", rate: "0.2 L / 10 orders", orders: 31 },
      { name: "Peppered Chicken", rate: "0.15 L / 10 orders", orders: 44 },
    ],
  },
  garlic: {
    unit: "kg", avgDailyUse: 0.8, usageRaw: usage([0.6, 0.8, 0.7, 0.9, 1, 1.2, 0.5]),
    supplier: "Eke-Ogboji Grains Market", lastRestockDate: "Sep 16, 2026", lastRestockCost: "₦9,600", lastRestockQty: "4 kg",
    usedInDishes: [{ name: "Garlic Fried Rice", rate: "0.25 kg / 10 orders", orders: 31 }],
  },
  assortedMeat: {
    unit: "kg", avgDailyUse: 1.5, usageRaw: usage([1.2, 1.5, 1.3, 1.6, 1.8, 2, 1]),
    supplier: "Sunrise Poultry Farm", lastRestockDate: "Sep 14, 2026", lastRestockCost: "₦40,500", lastRestockQty: "9 kg",
    usedInDishes: [{ name: "Ofada Special", rate: "0.26 kg / 10 orders", orders: 58 }],
  },
  peas: {
    unit: "kg", avgDailyUse: 1, usageRaw: usage([0.8, 1, 0.9, 1.1, 1.2, 1.4, 0.6]),
    supplier: "Eke-Ogboji Grains Market", lastRestockDate: "Sep 19, 2026", lastRestockCost: "₦14,700", lastRestockQty: "7 kg",
    usedInDishes: [
      { name: "Native Jollof", rate: "0.15 kg / 10 orders", orders: 41 },
      { name: "Garlic Fried Rice", rate: "0.1 kg / 10 orders", orders: 31 },
    ],
  },
  drinks: {
    unit: "crates", avgDailyUse: 2, usageRaw: usage([1.5, 2, 1.8, 2.2, 2.5, 3, 1.2]),
    supplier: "29Foods Beverage Distributor", lastRestockDate: "Sep 20, 2026", lastRestockCost: "₦71,500", lastRestockQty: "11 crates",
    usedInDishes: [{ name: "Drinks add-on", rate: "1 crate / 10 orders", orders: 210 }],
  },
};
