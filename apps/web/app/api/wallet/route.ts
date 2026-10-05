import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The signed-in user's wallet balance, plus — with ?topup=<tx_ref> — the status of that
 * top-up, so a page the customer returns to from checkout can wait for the webhook's
 * credit to land. Reads through the RLS-scoped client: users and wallet_transactions
 * both only expose the caller's own rows.
 */
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const txRef = new URL(request.url).searchParams.get("topup");
  const [{ data: profile }, topup] = await Promise.all([
    supabase.from("users").select("wallet_balance").eq("auth_uid", user.id).maybeSingle(),
    txRef
      ? supabase.from("wallet_transactions").select("status, amount").eq("flutterwave_tx_ref", txRef).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    balance: profile?.wallet_balance ?? 0,
    topup: topup.data ? { status: topup.data.status, amount: topup.data.amount } : null,
  });
}
