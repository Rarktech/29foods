import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { notifyPlanRequester } from "@/lib/plan-pay-notify";

/**
 * Called from the payer's browser once the /pay page has rendered. Done client-side on
 * purpose: link-preview crawlers (WhatsApp fetches the URL the moment the student sends
 * it) don't run JavaScript, so they can't trigger a false "your link was opened".
 * Only the first open by someone other than the student counts.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const service = getSupabaseServiceClient();
  const { data: payRequest } = await service
    .from("plan_pay_requests")
    .select("id, status, opened_at, requester_user_id")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!payRequest || payRequest.status !== "pending" || payRequest.opened_at) return NextResponse.json({ ok: true });

  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (user) {
    const { data: viewer } = await service.from("users").select("id").eq("auth_uid", user.id).maybeSingle();
    if (viewer?.id === payRequest.requester_user_id) return NextResponse.json({ ok: true });
  }

  // Conditional on still being unopened, so two tabs opening at once notify only once.
  const { data: marked } = await service
    .from("plan_pay_requests")
    .update({ opened_at: new Date().toISOString() })
    .eq("id", payRequest.id)
    .is("opened_at", null)
    .select("id");
  if (marked?.length) {
    await notifyPlanRequester(service, payRequest.requester_user_id, {
      title: "Your plan payment link was opened 👀",
      body: "Someone's looking at your meal plan now. We'll tell you the moment it's paid.",
      href: "/account",
    });
  }
  return NextResponse.json({ ok: true });
}
