import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@29foods/supabase-client";

type Client = SupabaseClient<Database>;

export interface Prize {
  key: string;
  label: string;
  copy: string;
  weight: number;
  tryAgain?: boolean;
}

// Order and weights match the wheel's 8 wedges exactly — index here is the wedge index.
export const PRIZES: Prize[] = [
  { key: "SPIN10", label: "10% off", copy: "10% off your next order, applied automatically at checkout.", weight: 16 },
  { key: "SPINFANTA", label: "a free Fanta", copy: "A free bottle of Fanta on your next order.", weight: 15 },
  { key: "SPIN500", label: "₦500 off", copy: "₦500 off your next order, applied automatically at checkout.", weight: 15 },
  { key: "TRYAGAIN", label: "another go", copy: "No prize this time — but you get another spin right now.", weight: 12, tryAgain: true },
  { key: "SPINFOOD", label: "a free food item", copy: "A free food item added to your next order, chef’s choice.", weight: 15 },
  { key: "SPIN1000", label: "₦1,000 off", copy: "₦1,000 off your next order — our biggest regular slice.", weight: 9 },
  { key: "SPIN20", label: "20% off", copy: "The jackpot — 20% off your next order, applied automatically.", weight: 4 },
  { key: "SPINFREEDEL", label: "free delivery", copy: "Free delivery on your next order, anywhere on the zone map.", weight: 14 },
];

export const REDEMPTION_WINDOW_HOURS = 6;

export function pickPrizeIndex(): number {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i]!.weight;
    if (r <= 0) return i;
  }
  return PRIZES.length - 1;
}

// Nigeria is UTC+1 with no DST — shift by 1h before taking the calendar date, same
// approach as the push-notification quiet-hours check.
function watDateString(d: Date): string {
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** True if the user's free spin for today (WAT) is already used — "try again" results don't count. */
export async function hasSpunToday(supabase: Client, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("spin_wins")
    .select("won_at")
    .eq("user_id", userId)
    .eq("is_try_again", false)
    .order("won_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  return watDateString(new Date(data.won_at)) === watDateString(new Date());
}

/**
 * `orderId` ties the spin to the paid order that earned it (the Telegram bot gives one
 * spin per paid order; spin_wins.order_id is unique, so a double-tap can't spin twice).
 * Only the final, non-try-again result carries the orderId.
 */
export async function recordSpin(supabase: Client, userId: string, index: number, orderId?: string) {
  const prize = PRIZES[index]!;
  const wonAt = new Date();
  const expiresAt = prize.tryAgain ? null : new Date(wonAt.getTime() + REDEMPTION_WINDOW_HOURS * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("spin_wins")
    .insert({
      user_id: userId,
      prize_key: prize.key,
      prize_label: prize.label,
      is_try_again: !!prize.tryAgain,
      won_at: wonAt.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      order_id: prize.tryAgain ? null : (orderId ?? null),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

type SpinWinRow = Database["public"]["Tables"]["spin_wins"]["Row"];

/** True if this order has already had its spin. */
export async function hasSpunForOrder(supabase: Client, orderId: string): Promise<boolean> {
  const { data } = await supabase.from("spin_wins").select("id").eq("order_id", orderId).maybeSingle();
  return !!data;
}

/** The user's newest unexpired, unredeemed prize, if any — applied automatically at the next checkout. */
export async function getActiveSpinWin(supabase: Client, userId: string): Promise<SpinWinRow | null> {
  const { data } = await supabase
    .from("spin_wins")
    .select("*")
    .eq("user_id", userId)
    .eq("is_try_again", false)
    .eq("redeemed", false)
    .gt("expires_at", new Date().toISOString())
    .order("won_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export interface AppliedSpinWin {
  /** Kobo off the order total. */
  discount: number;
  /** Menu item to add at ₦0 (the free-Fanta prize), if any. */
  freeItemName: string | null;
  /** Kitchen note (the chef's-choice prize), if any. */
  kitchenNote: string | null;
  /** Short human label for the summary line, e.g. "₦500 off". */
  label: string;
}

/** Turns a stored win into what it does to this order. Pure — no DB access. */
export function applySpinWin(win: Pick<SpinWinRow, "prize_key" | "prize_label">, subtotal: number, deliveryFee: number): AppliedSpinWin {
  const base = { discount: 0, freeItemName: null, kitchenNote: null, label: win.prize_label };
  switch (win.prize_key) {
    case "SPIN10":
      return { ...base, discount: Math.round(subtotal * 0.1) };
    case "SPIN20":
      return { ...base, discount: Math.round(subtotal * 0.2) };
    case "SPIN500":
      return { ...base, discount: Math.min(50000, subtotal) };
    case "SPIN1000":
      return { ...base, discount: Math.min(100000, subtotal) };
    case "SPINFREEDEL":
      return { ...base, discount: deliveryFee };
    case "SPINFANTA":
      return { ...base, freeItemName: "Fanta" };
    case "SPINFOOD":
      return { ...base, kitchenNote: "Spin prize: add one free chef's-choice item" };
    default:
      return base;
  }
}
