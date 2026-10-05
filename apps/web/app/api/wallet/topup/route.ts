import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createWalletTopup, initiateFlutterwavePayment, WALLET_TOPUP_MIN_KOBO, WALLET_TOPUP_MAX_KOBO, formatKobo } from "@29foods/core";
import { isEnabledFundingMethod, isTopupReturnPath, type TopupReturnPath } from "@/lib/funding-methods";

interface RequestBody {
  amountKobo: number;
  method: string;
  returnTo?: string;
}

/**
 * Starts a wallet top-up: records a pending wallet_transactions row and returns the
 * chosen provider's checkout URL. The balance is only credited when the provider's
 * webhook confirms payment (see /api/flutterwave/webhook → complete_wallet_topup).
 */
export async function POST(request: Request) {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = (await request.json()) as RequestBody;
  const amountKobo = Math.round(Number(body.amountKobo));
  if (!Number.isFinite(amountKobo) || amountKobo < WALLET_TOPUP_MIN_KOBO || amountKobo > WALLET_TOPUP_MAX_KOBO) {
    return NextResponse.json(
      { error: `Top-ups need to be between ${formatKobo(WALLET_TOPUP_MIN_KOBO)} and ${formatKobo(WALLET_TOPUP_MAX_KOBO)}.` },
      { status: 400 },
    );
  }
  if (!isEnabledFundingMethod(body.method)) {
    return NextResponse.json({ error: "That funding option isn't available right now." }, { status: 400 });
  }
  const returnTo: TopupReturnPath = isTopupReturnPath(body.returnTo) ? body.returnTo : "/account";

  const service = getSupabaseServiceClient();
  const { data: profile } = await service.from("users").select("id, name, email, phone").eq("auth_uid", user.id).single();
  if (!profile) return NextResponse.json({ error: "Could not find your account. Please sign in again." }, { status: 400 });

  const txRef = `29foods_wallet_${randomUUID()}`;
  await createWalletTopup(service, profile.id, amountKobo, txRef);

  const baseUrl = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? new URL(request.url).origin;
  const redirectUrl = `${baseUrl}${returnTo}?topup=${encodeURIComponent(txRef)}`;

  // One branch per provider in lib/funding-methods.ts.
  switch (body.method) {
    case "flutterwave": {
      const { paymentLink } = await initiateFlutterwavePayment({
        txRef,
        amountNaira: amountKobo / 100,
        customerEmail: profile.email ?? user.email ?? "customer@29foods.app",
        customerName: profile.name,
        customerPhone: profile.phone,
        redirectUrl,
      });
      return NextResponse.json({ checkoutUrl: paymentLink });
    }
  }
}
