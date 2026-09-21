import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  createSubscriptionWithPendingPayment,
  initiateFlutterwavePayment,
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

  const baseUrl = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? new URL(request.url).origin;
  const { paymentLink } = await initiateFlutterwavePayment({
    txRef,
    amountNaira: subscription.total_paid / 100,
    customerEmail: profile.email ?? user.email ?? "customer@29foods.app",
    customerName: profile.name,
    customerPhone: profile.phone,
    redirectUrl: `${baseUrl}/plans/confirmed/${subscription.id}`,
  });

  return NextResponse.json({ subscriptionId: subscription.id, paymentLink });
}
