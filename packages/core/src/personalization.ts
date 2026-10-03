import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@29foods/supabase-client";
import type { CartItem } from "./inventory";

type Client = SupabaseClient<Database>;

export interface Usual {
  items: CartItem[];
  lodge: string;
  room: string | null;
}

export interface OrderHistory {
  /** Null until the user has 2+ paid orders — a "usual" after one order feels presumptuous. */
  usual: Usual | null;
  paidOrderCount: number;
  daysSinceLastOrder: number | null;
}

/** Order-independent key for "the same combination", e.g. "id-a:1|id-b:2". */
function comboKey(items: CartItem[]): string {
  return items
    .filter((i) => i.unit_price > 0) // free prize lines don't make a combination different
    .map((i) => `${i.menu_item_id}:${i.qty}`)
    .sort()
    .join("|");
}

/**
 * The "usual" is the most recent paid order, unless one combination has been ordered
 * 3+ times — then that combination locks in, so a one-off experiment doesn't overwrite
 * a real pattern.
 */
export async function getOrderHistory(supabase: Client, userId: string): Promise<OrderHistory> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("items, lodge, room, paid_at")
    .eq("user_id", userId)
    .eq("payment_status", "paid")
    .is("subscription_id", null)
    .order("paid_at", { ascending: false })
    .limit(30);
  if (error) throw error;

  const paid = orders ?? [];
  const last = paid[0];
  const daysSinceLastOrder = last?.paid_at ? Math.floor((Date.now() - new Date(last.paid_at).getTime()) / 86_400_000) : null;
  if (paid.length < 2 || !last) return { usual: null, paidOrderCount: paid.length, daysSinceLastOrder };

  const counts = new Map<string, number>();
  for (const o of paid) {
    const key = comboKey(o.items as unknown as CartItem[]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let chosen = last;
  let best = 0;
  for (const o of paid) {
    const n = counts.get(comboKey(o.items as unknown as CartItem[]))!;
    if (n >= 3 && n > best) {
      best = n;
      chosen = o;
    }
  }

  const items = (chosen.items as unknown as CartItem[]).filter((i) => i.unit_price > 0);
  return { usual: { items, lodge: chosen.lodge, room: chosen.room }, paidOrderCount: paid.length, daysSinceLastOrder };
}
