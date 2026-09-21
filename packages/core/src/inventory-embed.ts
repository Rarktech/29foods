type StockRow = { stock_count: number };

/**
 * `inventory.menu_item_id` is both inventory's PK and its FK to menu_items, making it a true
 * 1:1 relationship — PostgREST embeds it as a single object (`{stock_count: 50}`), not an
 * array, when queried as `menu_items.select("...,inventory(stock_count)")`. Handles both
 * shapes defensively since which one you get depends on the exact FK PostgREST introspects.
 */
export function stockCountFromEmbed(inventory: StockRow | StockRow[] | null | undefined): number {
  if (!inventory) return 0;
  return Array.isArray(inventory) ? (inventory[0]?.stock_count ?? 0) : inventory.stock_count;
}
