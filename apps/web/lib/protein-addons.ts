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

/*
 * A dish can carry several proteins. The cart and the orders API identify a combination
 * by one string key — the chosen ids in PROTEIN_ADDONS order joined with "+", e.g.
 * "chicken+beef" — so "chicken+beef" and "beef+chicken" are the same cart line, and a
 * key from before multi-select (a single id like "chicken") still resolves.
 */
const KEY_SEPARATOR = "+";

/** Stable key for a set of protein ids; undefined when none are chosen. */
export function proteinKey(ids: Iterable<string>): string | undefined {
  const chosen = new Set(ids);
  const ordered = PROTEIN_ADDONS.filter((p) => chosen.has(p.id)).map((p) => p.id);
  return ordered.length > 0 ? ordered.join(KEY_SEPARATOR) : undefined;
}

/**
 * The proteins a key stands for, or null if it names anything unknown or repeats one —
 * the orders API rejects those rather than guessing.
 */
export function resolveProteinKey(key: string): ProteinAddon[] | null {
  const ids = key.split(KEY_SEPARATOR);
  if (new Set(ids).size !== ids.length) return null;
  const addons = ids.map((id) => PROTEIN_ADDONS.find((p) => p.id === id));
  return addons.every((a): a is ProteinAddon => !!a) ? addons : null;
}

export function proteinsLabel(addons: ProteinAddon[]): string {
  return addons.map((a) => a.label).join(" + ");
}

export function proteinsPrice(addons: ProteinAddon[]): number {
  return addons.reduce((sum, a) => sum + a.priceKobo, 0);
}
