import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature, verifyTransaction, markOrderPaid, markSubscriptionPaid } from "@29foods/core";

// Flutterwave webhook. Never trust the request body's `status`/`amount` fields directly —
// verify the signature header, then re-verify the transaction against Flutterwave's API
// before marking anything paid. mark_order_paid()/mark_subscription_paid() are idempotent,
// so a replayed webhook (Flutterwave retries on non-2xx) is safe.
export async function POST(request: Request) {
  const signature = request.headers.get("verif-hash");
  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Flutterwave's actual webhook body isn't consistently the documented `{event, data:{...}}`
  // shape — some transaction types (observed: USSD_TRANSACTION) send id/txRef flat at the top
  // level instead. Accept either shape rather than assuming one.
  const payload = (await request.json()) as {
    data?: { id?: number | string; tx_ref?: string };
    id?: number | string;
    txRef?: string;
  };
  const transactionId = (payload.data?.id ?? payload.id)?.toString();
  const txRef = payload.data?.tx_ref ?? payload.txRef;
  if (!transactionId || !txRef) {
    console.error("[flw-webhook] malformed payload", JSON.stringify(payload));
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const verified = await verifyTransaction(transactionId);
  if (!verified.isSuccessful || verified.txRef !== txRef || verified.currency !== "NGN") {
    console.error("[flw-webhook] verification failed", {
      transactionId, expectedTxRef: txRef, gotTxRef: verified.txRef,
      isSuccessful: verified.isSuccessful, currency: verified.currency,
    });
    return NextResponse.json({ error: "Transaction not verified as successful" }, { status: 400 });
  }

  const service = getSupabaseServiceClient();
  const paidAmountKobo = Math.round(verified.amountNaira * 100);

  const { data: order } = await service.from("orders").select("id, total").eq("flutterwave_tx_ref", txRef).maybeSingle();
  if (order) {
    if (paidAmountKobo !== order.total) {
      console.error("[flw-webhook] amount mismatch", { orderId: order.id, txRef, paidAmountKobo, orderTotal: order.total });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
    await markOrderPaid(service, order.id, transactionId);
    return NextResponse.json({ received: true });
  }

  const { data: subscription } = await service
    .from("subscriptions")
    .select("id, total_paid")
    .eq("flutterwave_tx_ref", txRef)
    .maybeSingle();
  if (subscription) {
    if (paidAmountKobo !== subscription.total_paid) {
      console.error("[flw-webhook] amount mismatch", { subscriptionId: subscription.id, txRef, paidAmountKobo, totalPaid: subscription.total_paid });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
    await markSubscriptionPaid(service, subscription.id, transactionId);
    return NextResponse.json({ received: true });
  }

  console.error("[flw-webhook] no order or subscription found for tx_ref", txRef);
  return NextResponse.json({ error: "No order or subscription found for tx_ref" }, { status: 404 });
}
