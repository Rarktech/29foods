export interface ProteinAddon {
  id: string;
  label: string;
  priceKobo: number;
}

/** Optional protein add-ons offered on rice dishes — priced on top of the base item. */
export const PROTEIN_ADDONS: ProteinAddon[] = [
  { id: "chicken", label: "Grilled Chicken", priceKobo: 50000 },
  { id: "fish", label: "Fried Fish", priceKobo: 40000 },
  { id: "beef", label: "Beef", priceKobo: 45000 },
];
