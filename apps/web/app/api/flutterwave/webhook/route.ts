import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature, verifyTransaction, markOrderPaid } from "@29foods/core";

// Flutterwave webhook. Never trust the request body's `status`/`amount` fields directly —
// verify the signature header, then re-verify the transaction against Flutterwave's API
// before marking anything paid. mark_order_paid() is idempotent, so a replayed webhook
// (Flutterwave retries on non-2xx) is safe.
export async function POST(request: Request) {
  const signature = request.headers.get("verif-hash");
  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = await request.json();
  const transactionId: string | undefined = payload?.data?.id?.toString();
  const txRef: string | undefined = payload?.data?.tx_ref;
  if (!transactionId || !txRef) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const verified = await verifyTransaction(transactionId);
  if (!verified.isSuccessful || verified.txRef !== txRef || verified.currency !== "NGN") {
    return NextResponse.json({ error: "Transaction not verified as successful" }, { status: 400 });
  }

  const service = getSupabaseServiceClient();
  const { data: order, error } = await service.from("orders").select("id, total").eq("flutterwave_tx_ref", txRef).single();
  if (error || !order) {
    return NextResponse.json({ error: "Order not found for tx_ref" }, { status: 404 });
  }

  // Defense in depth: the paid amount must match what we charged for, in naira (order.total is stored in kobo).
  if (Math.round(verified.amountNaira * 100) !== order.total) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  await markOrderPaid(service, order.id, transactionId);
  return NextResponse.json({ received: true });
}
