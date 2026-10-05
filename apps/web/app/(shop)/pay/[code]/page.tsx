import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PLAN_DURATIONS } from "@29foods/core";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { PayRequestView, type PayRequestDetails } from "@/components/PayRequestView";

const MEAL_ORDER = ["breakfast", "lunch", "dinner"];

/**
 * Public page a loved one opens from a shared "pay for my plan" link — no account needed.
 * Read through the service client by its unguessable code, and only shows what a payer
 * needs: the student's first name, the meals, the lodge (never the room) and the total.
 */
async function loadPayRequest(rawCode: string): Promise<PayRequestDetails | null> {
  const code = rawCode.toUpperCase();
  const service = getSupabaseServiceClient();
  const { data: request } = await service.from("plan_pay_requests").select("*").eq("code", code).maybeSingle();
  if (!request) return null;

  const [{ data: subscription }, { data: requester }, { data: slots }] = await Promise.all([
    service.from("subscriptions").select("duration_id, lodge, start_date, end_date").eq("id", request.subscription_id).maybeSingle(),
    service.from("users").select("name").eq("id", request.requester_user_id).maybeSingle(),
    service.from("subscription_slots").select("id, meal_time, addon_enabled, addon_label").eq("subscription_id", request.subscription_id),
  ]);
  if (!subscription) return null;

  const { data: dishes } = await service
    .from("subscription_slot_dishes")
    .select("subscription_slot_id, dish_name, frequency_per_week")
    .in("subscription_slot_id", (slots ?? []).map((s) => s.id));

  const meals = [...(slots ?? [])]
    .sort((a, b) => MEAL_ORDER.indexOf(a.meal_time) - MEAL_ORDER.indexOf(b.meal_time))
    .map((slot) => ({
      label: slot.meal_time.charAt(0).toUpperCase() + slot.meal_time.slice(1),
      dishes: (dishes ?? []).filter((d) => d.subscription_slot_id === slot.id).map((d) => `${d.frequency_per_week}× ${d.dish_name} a week`),
      addon: slot.addon_enabled ? slot.addon_label : null,
    }));

  return {
    code,
    status: request.status === "pending" && new Date(request.expires_at).getTime() < Date.now() ? "expired" : request.status,
    requesterFirstName: requester?.name?.trim().split(/\s+/)[0] || "Your friend",
    requesterUserId: request.requester_user_id,
    durationLabel: PLAN_DURATIONS.find((d) => d.id === subscription.duration_id)?.label ?? "Meal plan",
    lodge: subscription.lodge,
    meals,
    amount: request.amount,
    expiresAt: request.expires_at,
    payerName: request.payer_name,
    payerEmail: request.payer_email,
    payerMessage: request.payer_message,
    paidAt: request.paid_at,
    planStart: subscription.start_date,
    planEnd: subscription.end_date,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const details = await loadPayRequest(code);
  if (!details) return { title: "29Foods" };
  // What WhatsApp/iMessage show in the link preview.
  return {
    title: `Help ${details.requesterFirstName} pay for their 29Foods meal plan`,
    description: `${details.durationLabel} of hot meals delivered to ${details.lodge}. Pay securely by card, bank transfer or USSD.`,
  };
}

export default async function PayRequestPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ paid?: string }> }) {
  const [{ code }, { paid }] = await Promise.all([params, searchParams]);
  const details = await loadPayRequest(code);
  if (!details) notFound();

  // Is the student looking at their own link? Then show sharing, not the payment form.
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let viewerIsRequester = false;
  if (session?.user) {
    const { data: viewer } = await supabase.from("users").select("id").eq("auth_uid", session.user.id).maybeSingle();
    viewerIsRequester = viewer?.id === details.requesterUserId;
  }

  return <PayRequestView details={details} viewerIsRequester={viewerIsRequester} returnedFromCheckout={paid === "1"} />;
}
