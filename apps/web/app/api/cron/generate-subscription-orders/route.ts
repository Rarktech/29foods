import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createSubscriptionDeliveryOrder } from "@29foods/core";

// Vercel Cron target — daily, before breakfast. "Spends" each active subscription's
// prepaid balance by generating one ordinary `orders` row per scheduled dish for
// today, so every existing surface (admin dashboard, rider bot, live tracking,
// feedback, loyalty) keeps working for subscription deliveries unchanged.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getSupabaseServiceClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekday = today.getDay(); // 0=Sun..6=Sat, matches assignWeekdays()

  const { data: subscriptions, error: subscriptionsError } = await service
    .from("subscriptions")
    .select("id")
    .eq("status", "active")
    .lte("start_date", todayStr)
    .gte("end_date", todayStr);
  if (subscriptionsError) throw subscriptionsError;

  let created = 0;
  const skipped: { subscriptionId: string; dishKey: string; reason: string }[] = [];

  for (const subscription of subscriptions ?? []) {
    const { data: slots, error: slotsError } = await service
      .from("subscription_slots")
      .select("id, addon_enabled, addon_label, addon_price_kobo")
      .eq("subscription_id", subscription.id);
    if (slotsError) throw slotsError;

    for (const slot of slots ?? []) {
      const { data: dishes, error: dishesError } = await service
        .from("subscription_slot_dishes")
        .select("dish_key, dish_name, unit_price_kobo, scheduled_weekdays")
        .eq("subscription_slot_id", slot.id)
        .contains("scheduled_weekdays", [weekday]);
      if (dishesError) throw dishesError;

      for (const dish of dishes ?? []) {
        try {
          await createSubscriptionDeliveryOrder(service, {
            subscriptionId: subscription.id,
            dishKey: dish.dish_key,
            dishName: dish.dish_name,
            unitPrice: dish.unit_price_kobo,
            addonLabel: slot.addon_enabled ? slot.addon_label : null,
            addonPrice: slot.addon_enabled ? slot.addon_price_kobo : null,
          });
          created += 1;
        } catch (err) {
          // One dish failing (e.g. a future capacity guard) shouldn't fail the whole run.
          skipped.push({ subscriptionId: subscription.id, dishKey: dish.dish_key, reason: err instanceof Error ? err.message : "unknown" });
        }
      }
    }
  }

  return NextResponse.json({ created, skipped });
}
