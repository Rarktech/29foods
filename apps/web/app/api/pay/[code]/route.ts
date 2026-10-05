import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { initiateFlutterwavePayment, payRequestTxRef, PAYER_MESSAGE_MAX } from "@29foods/core";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Public: just the request's status, so the payer's page can wait for the webhook after checkout. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data } = await getSupabaseServiceClient().from("plan_pay_requests").select("status").eq("code", code.toUpperCase()).maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ status: data.status });
}

/**
 * Public: the payer (no account needed) submits their name, email for the receipt and an
 * optional message, and gets a Flutterwave checkout for exactly the plan's total. Each
 * attempt gets its own tx_ref; the webhook resolves any of them back to this request.
 */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const body = (await request.json()) as { name?: string; email?: string; message?: string };
  const name = body.name?.trim().slice(0, 60) ?? "";
  const email = body.email?.trim().slice(0, 120) ?? "";
  const message = body.message?.trim().slice(0, PAYER_MESSAGE_MAX) || null;
  if (!name) return NextResponse.json({ error: "Please add your name." }, { status: 400 });
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Please add a valid email for your receipt." }, { status: 400 });

  const service = getSupabaseServiceClient();
  const { data: payRequest } = await service.from("plan_pay_requests").select("id, amount, status, expires_at").eq("code", code).maybeSingle();
  if (!payRequest) return NextResponse.json({ error: "This payment link doesn't exist." }, { status: 404 });
  if (payRequest.status === "paid") return NextResponse.json({ error: "This plan has already been paid for. 🎉" }, { status: 409 });
  if (payRequest.status !== "pending" || new Date(payRequest.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This payment link has expired. Ask for a new one." }, { status: 410 });
  }

  await service.from("plan_pay_requests").update({ payer_name: name, payer_email: email, payer_message: message }).eq("id", payRequest.id);

  const baseUrl = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? new URL(request.url).origin;
  const { paymentLink } = await initiateFlutterwavePayment({
    txRef: payRequestTxRef(code),
    amountNaira: payRequest.amount / 100,
    customerEmail: email, // Flutterwave emails its payment receipt here
    customerName: name,
    customerPhone: null,
    redirectUrl: `${baseUrl}/pay/${code}?paid=1`,
  });
  return NextResponse.json({ checkoutUrl: paymentLink });
}
