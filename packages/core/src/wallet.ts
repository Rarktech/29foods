import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@29foods/supabase-client";

type Client = SupabaseClient<Database>;
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type WalletTxRow = Database["public"]["Tables"]["wallet_transactions"]["Row"];

/** Preset top-up sizes, matched to real order patterns rather than a blank amount field. */
export const WALLET_TOPUP_PRESETS_KOBO = [300000, 500000, 1000000]; // ₦3,000 / ₦5,000 / ₦10,000
/** Bounds for a typed-in top-up amount. */
export const WALLET_TOPUP_MIN_KOBO = 50000; // ₦500
export const WALLET_TOPUP_MAX_KOBO = 10000000; // ₦100,000

/** Parses what someone types as an amount — "5000", "5,000", "₦5k", "N 2.5k" — into kobo. Null if it isn't one. */
export function parseNairaAmount(text: string): number | null {
  const match = text.trim().toLowerCase().replace(/[₦n,\s]/g, "").match(/^(\d+(?:\.\d*)?)(k?)$/); // "5000." counts — it's mid-typing, not invalid
  if (!match) return null;
  const naira = Number(match[1]) * (match[2] ? 1000 : 1);
  return Number.isFinite(naira) && naira > 0 ? Math.round(naira * 100) : null;
}

export async function getWalletBalance(supabase: Client, userId: string): Promise<number> {
  const { data, error } = await supabase.from("users").select("wallet_balance").eq("id", userId).single();
  if (error) throw error;
  return data.wallet_balance;
}

/** Records a pending top-up; the Flutterwave webhook completes it via completeWalletTopup. */
export async function createWalletTopup(supabase: Client, userId: string, amountKobo: number, txRef: string): Promise<WalletTxRow> {
  const { data, error } = await supabase.rpc("create_wallet_topup", { p_user_id: userId, p_amount: amountKobo, p_tx_ref: txRef });
  if (error) throw error;
  return data;
}

/** Idempotent — safe to call more than once for the same tx_ref (e.g. a replayed webhook). */
export async function completeWalletTopup(supabase: Client, txRef: string, txId: string): Promise<WalletTxRow> {
  const { data, error } = await supabase.rpc("complete_wallet_topup", { p_tx_ref: txRef, p_tx_id: txId });
  if (error) throw error;
  return data;
}

/** For orders created with walletAmount === total — marks them paid with no Flutterwave hop. */
export async function payOrderFullyFromWallet(supabase: Client, orderId: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc("pay_order_fully_from_wallet", { p_order_id: orderId });
  if (error) throw error;
  return data;
}

/** Paid orders in the last `days` that went through Flutterwave (not fully settled from the wallet). */
export async function countRecentTransferPayments(supabase: Client, userId: string, days = 7): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("payment_status", "paid")
    .neq("flutterwave_tx_id", "wallet")
    .gte("paid_at", since);
  if (error) throw error;
  return count ?? 0;
}
