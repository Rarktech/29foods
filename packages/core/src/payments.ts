const FLW_BASE_URL = "https://api.flutterwave.com/v3";

// Minimal shape of what we read from Flutterwave's responses — not a full API type.
interface FlutterwaveApiResponse {
  status: string;
  data: {
    link?: string;
    id?: number;
    status?: string;
    amount?: number;
    currency?: string;
    tx_ref?: string;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export interface InitiatePaymentParams {
  txRef: string;
  amountNaira: number; // Flutterwave's API takes major units (naira), not kobo
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  redirectUrl: string;
}

/** Creates a Flutterwave standard-checkout payment link. */
export async function initiateFlutterwavePayment(params: InitiatePaymentParams): Promise<{ paymentLink: string }> {
  const response = await fetch(`${FLW_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("FLUTTERWAVE_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: params.amountNaira,
      currency: "NGN",
      redirect_url: params.redirectUrl,
      customer: {
        email: params.customerEmail,
        name: params.customerName ?? undefined,
        phonenumber: params.customerPhone ?? undefined,
      },
      customizations: { title: "29Foods" },
    }),
  });

  const body = (await response.json()) as FlutterwaveApiResponse;
  if (!response.ok || body.status !== "success" || !body.data.link) {
    throw new Error(`Flutterwave payment initiation failed: ${JSON.stringify(body)}`);
  }
  return { paymentLink: body.data.link };
}

/**
 * Flutterwave signs webhooks with a static secret hash you configure in the
 * dashboard, echoed back in the `verif-hash` header — a simple constant-time
 * comparison against FLUTTERWAVE_WEBHOOK_HASH. This alone is NOT sufficient to
 * trust the payload; always follow up with verifyTransaction() against
 * Flutterwave's API before marking an order paid (never trust webhook body
 * fields like `status`/`amount` directly).
 */
export function verifyWebhookSignature(headerHash: string | null): boolean {
  const expected = requireEnv("FLUTTERWAVE_WEBHOOK_HASH");
  if (!headerHash || headerHash.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= headerHash.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface VerifiedTransaction {
  isSuccessful: boolean;
  amountNaira: number;
  currency: string;
  txRef: string;
}

/** Re-verifies a transaction directly against Flutterwave's API — the source of truth, never the webhook body. */
export async function verifyTransaction(transactionId: string): Promise<VerifiedTransaction> {
  const response = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${requireEnv("FLUTTERWAVE_SECRET_KEY")}` },
  });
  const body = (await response.json()) as FlutterwaveApiResponse;
  if (!response.ok || body.status !== "success") {
    throw new Error(`Flutterwave transaction verification failed: ${JSON.stringify(body)}`);
  }
  const data = body.data;
  return {
    isSuccessful: data.status === "successful",
    amountNaira: data.amount ?? 0,
    currency: data.currency ?? "",
    txRef: data.tx_ref ?? "",
  };
}
