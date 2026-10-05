import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@29foods/supabase-client";
import { shortOpId } from "./compact-id";

type Client = SupabaseClient<Database>;
type PayRequestRow = Database["public"]["Tables"]["plan_pay_requests"]["Row"];

/** How long a "pay for my plan" link stays payable. */
export const PAY_REQUEST_TTL_HOURS = 48;
export const PAYER_MESSAGE_MAX = 200;

// No 0/O/1/I — the code shows up in a URL people may read out or retype.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TX_REF_PREFIX = "29foods_payreq_";

function newPayRequestCode(): string {
  // Web Crypto, not node:crypto — this package's barrel is also bundled for the browser.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function payRequestExpiry(): string {
  return new Date(Date.now() + PAY_REQUEST_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

/** Creates the shareable request for a pending plan (its expiry should already be extended to match). */
export async function createPlanPayRequest(
  supabase: Client,
  params: { subscriptionId: string; requesterUserId: string; amount: number; expiresAt: string },
): Promise<PayRequestRow> {
  // A clash on 8 chars from a 32-letter alphabet is vanishingly rare; retry once anyway.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("plan_pay_requests")
      .insert({
        code: newPayRequestCode(),
        subscription_id: params.subscriptionId,
        requester_user_id: params.requesterUserId,
        amount: params.amount,
        expires_at: params.expiresAt,
      })
      .select("*")
      .single();
    if (!error) return data;
    if (error.code !== "23505" || attempt === 1) throw error;
  }
  throw new Error("unreachable");
}

/**
 * A fresh Flutterwave tx_ref per payment attempt (a payer may abandon checkout and try
 * again), all carrying the request code so the webhook can find the request from any of them.
 */
export function payRequestTxRef(code: string): string {
  return `${TX_REF_PREFIX}${code}_${shortOpId()}`;
}

/** The request code inside a pay-request tx_ref, or null for any other kind of payment. */
export function payRequestCodeFromTxRef(txRef: string): string | null {
  if (!txRef.startsWith(TX_REF_PREFIX)) return null;
  return txRef.slice(TX_REF_PREFIX.length).split("_")[0] || null;
}

/** Idempotent — activates the plan and marks the request paid (see mark_plan_pay_request_paid). */
export async function markPlanPayRequestPaid(supabase: Client, code: string, txId: string): Promise<PayRequestRow> {
  const { data, error } = await supabase.rpc("mark_plan_pay_request_paid", { p_code: code, p_tx_id: txId });
  if (error) throw error;
  return data;
}
