import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  createSubscriptionWithPendingPayment,
  paySubscriptionFromWallet,
  expirePendingSubscription,
  createPlanPayRequest,
  payRequestExpiry,
  InsufficientWalletError,
  formatKobo,
  computeSubscriptionPricing,
  assignWeekdays,
  PLAN_DURATIONS,
  PLAN_DISH_CATALOG,
  PLAN_SLOT_ADDONS,
  type DurationId,
  type MealTime,
  type PlanSlotInput,
  type SubscriptionSlotPayload,
} from "@29foods/core";

interface RequestSlot {
  mealTime: MealTime;
  enabled: boolean;
  addonEnabled: boolean;
  dishes: { dishKey: string; frequencyPerWeek: number }[];
}

interface RequestBody {
  durationId: DurationId;
  lodge: string;
  room: string | null;
  slots: RequestSlot[];
  /** "someone" = don't charge the wallet; create a /pay/<code> link for a loved one to pay instead. */
  payer?: "self" | "someone";
}

export async function POST(request: Request) {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = (await request.json()) as RequestBody;
  const duration = PLAN_DURATIONS.find((d) => d.id === body.durationId);
  if (!duration || !body.lodge?.trim() || !body.slots?.length) {
    return NextResponse.json({ error: "Missing plan details." }, { status: 400 });
  }

  // Never trust client-supplied prices — re-derive every figure from the plan catalog server-side.
  const pricingInput: PlanSlotInput[] = body.slots.map((slot) => ({
    mealTime: slot.mealTime,
    enabled: slot.enabled,
    addonEnabled: slot.addonEnabled,
    dishes: slot.dishes.filter((d) => d.frequencyPerWeek > 0),
  }));

  for (const slot of pricingInput) {
    const totalFreq = slot.dishes.reduce((sum, d) => sum + d.frequencyPerWeek, 0);
    if (totalFreq > 7) {
      return NextResponse.json({ error: "A meal slot can't exceed 7 deliveries a week." }, { status: 400 });
    }
    for (const dish of slot.dishes) {
      if (!PLAN_DISH_CATALOG[slot.mealTime].some((d) => d.key === dish.dishKey)) {
        return NextResponse.json({ error: "Unknown dish in your plan." }, { status: 400 });
      }
    }
  }

  const pricing = computeSubscriptionPricing(pricingInput, duration.numWeeks);
  if (!pricing.hasAnyMeal) {
    return NextResponse.json({ error: "Choose at least one meal." }, { status: 400 });
  }

  const service = getSupabaseServiceClient();
  const { data: profile, error: profileError } = await service.from("users").select("*").eq("auth_uid", user.id).single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Could not find your account. Please sign in again." }, { status: 400 });
  }

  const payerIsSomeoneElse = body.payer === "someone";

  // The website is wallet-only — Flutterwave is only for funding the wallet (and for a
  // loved one paying via a shared link, who has no wallet).
  if (!payerIsSomeoneElse && profile.wallet_balance < pricing.grandTotal) {
    return NextResponse.json(
      {
        error: `Your wallet has ${formatKobo(profile.wallet_balance)}, this plan is ${formatKobo(pricing.grandTotal)}. Top up to start it.`,
        code: "INSUFFICIENT_WALLET",
        shortfall: pricing.grandTotal - profile.wallet_balance,
      },
      { status: 402 },
    );
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration.numWeeks * 7 - 1);

  const slotPayloads: SubscriptionSlotPayload[] = pricingInput
    .filter((slot) => slot.enabled && slot.dishes.length > 0)
    .map((slot) => ({
      meal_time: slot.mealTime,
      addon_enabled: slot.addonEnabled,
      addon_label: slot.addonEnabled ? PLAN_SLOT_ADDONS[slot.mealTime].label : null,
      addon_price_kobo: slot.addonEnabled ? PLAN_SLOT_ADDONS[slot.mealTime].priceKobo : null,
      dishes: slot.dishes.map((dish) => {
        const catalogDish = PLAN_DISH_CATALOG[slot.mealTime].find((d) => d.key === dish.dishKey)!;
        return {
          dish_key: dish.dishKey,
          dish_name: catalogDish.name,
          frequency_per_week: dish.frequencyPerWeek,
          unit_price_kobo: catalogDish.priceKobo,
          scheduled_weekdays: assignWeekdays(dish.frequencyPerWeek),
        };
      }),
    }));

  const txRef = `29foods_plan_${randomUUID()}`;

  const subscription = await createSubscriptionWithPendingPayment(service, {
    userId: profile.id,
    durationId: duration.id,
    numWeeks: duration.numWeeks,
    lodge: body.lodge.trim(),
    room: body.room?.trim() || null,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    slots: slotPayloads,
    foodSubtotal: pricing.foodSubtotal,
    deliveryTotal: pricing.deliveryTotal,
    total: pricing.grandTotal,
    deliveriesTotal: pricing.deliveries,
    txRef,
  });

  if (payerIsSomeoneElse) {
    // Keep the plan open long enough for the link to be seen and paid, and create the link.
    const expiresAt = payRequestExpiry();
    await service.from("subscriptions").update({ expires_at: expiresAt }).eq("id", subscription.id);
    const payRequest = await createPlanPayRequest(service, {
      subscriptionId: subscription.id,
      requesterUserId: profile.id,
      amount: subscription.total_paid,
      expiresAt,
    });
    const baseUrl = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? new URL(request.url).origin;
    return NextResponse.json({ subscriptionId: subscription.id, payRequestCode: payRequest.code, payUrl: `${baseUrl}/pay/${payRequest.code}` });
  }

  try {
    await paySubscriptionFromWallet(service, subscription.id);
  } catch (err) {
    if (err instanceof InsufficientWalletError) {
      // Balance moved between the check above and the atomic debit (e.g. a second tab) — drop the pending plan.
      await expirePendingSubscription(service, subscription.id);
      return NextResponse.json({ error: "Your wallet balance changed. Top up to start this plan.", code: "INSUFFICIENT_WALLET" }, { status: 402 });
    }
    throw err;
  }

  return NextResponse.json({ subscriptionId: subscription.id, paid: true });
}
