import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { expirePendingSubscription } from "@29foods/core";

/** The student withdraws a "pay for my plan" link they shared. Only theirs, and only while unpaid. */
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const service = getSupabaseServiceClient();
  const { data: profile } = await service.from("users").select("id").eq("auth_uid", user.id).maybeSingle();
  const { data: payRequest } = await service
    .from("plan_pay_requests")
    .select("id, status, subscription_id, requester_user_id")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!profile || !payRequest || payRequest.requester_user_id !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (payRequest.status !== "pending") {
    return NextResponse.json({ error: payRequest.status === "paid" ? "That plan has already been paid for." : "That link is no longer active." }, { status: 409 });
  }

  await service.from("plan_pay_requests").update({ status: "cancelled" }).eq("id", payRequest.id).eq("status", "pending");
  await expirePendingSubscription(service, payRequest.subscription_id);
  revalidatePath("/account");
  return NextResponse.json({ ok: true });
}
