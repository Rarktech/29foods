import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature, verifyTransaction, markOrderPaid, markSubscriptionPaid, completeWalletTopup } from "@29foods/core";

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

  const { data: order } = await service.from("orders").select("id, total, wallet_paid").eq("flutterwave_tx_ref", txRef).maybeSingle();
  if (order) {
    // Part of a bot order may already be held from the customer's wallet — Flutterwave only charges the rest.
    const amountDue = order.total - order.wallet_paid;
    if (paidAmountKobo !== amountDue) {
      console.error("[flw-webhook] amount mismatch", { orderId: order.id, txRef, paidAmountKobo, amountDue });
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

  const { data: topup } = await service
    .from("wallet_transactions")
    .select("id, amount")
    .eq("flutterwave_tx_ref", txRef)
    .eq("kind", "topup")
    .maybeSingle();
  if (topup) {
    if (paidAmountKobo !== topup.amount) {
      console.error("[flw-webhook] amount mismatch", { walletTxId: topup.id, txRef, paidAmountKobo, amount: topup.amount });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
    await completeWalletTopup(service, txRef, transactionId);
    return NextResponse.json({ received: true });
  }

  console.error("[flw-webhook] no order, subscription or wallet top-up found for tx_ref", txRef);
  return NextResponse.json({ error: "No order, subscription or wallet top-up found for tx_ref" }, { status: 404 });
}
