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

  const subscriptionIds = (subscriptions ?? []).map((s) => s.id);
  if (subscriptionIds.length === 0) {
    return NextResponse.json({ created: 0, skipped: [] });
  }

  // Batch the slot/dish lookups (one query each across all subscriptions instead of
  // one per subscription/slot) and fire every delivery-order RPC concurrently — each
  // call is scoped to its own subscription row, so there's no cross-row contention to
  // serialize for. This keeps the cron's runtime roughly flat as the subscriber base
  // grows, instead of scaling linearly with subscriptions × slots × dishes.
  const { data: slots, error: slotsError } = await service
    .from("subscription_slots")
    .select("id, subscription_id, addon_enabled, addon_label, addon_price_kobo")
    .in("subscription_id", subscriptionIds);
  if (slotsError) throw slotsError;

  const slotIds = (slots ?? []).map((s) => s.id);
  const { data: dishes, error: dishesError } = slotIds.length
    ? await service
        .from("subscription_slot_dishes")
        .select("subscription_slot_id, dish_key, dish_name, unit_price_kobo, scheduled_weekdays")
        .in("subscription_slot_id", slotIds)
        .contains("scheduled_weekdays", [weekday])
    : { data: [], error: null };
  if (dishesError) throw dishesError;

  const slotById = new Map((slots ?? []).map((s) => [s.id, s]));

  const results = await Promise.all(
    (dishes ?? []).map(async (dish) => {
      const slot = slotById.get(dish.subscription_slot_id)!;
      try {
        await createSubscriptionDeliveryOrder(service, {
          subscriptionId: slot.subscription_id,
          dishKey: dish.dish_key,
          dishName: dish.dish_name,
          unitPrice: dish.unit_price_kobo,
          addonLabel: slot.addon_enabled ? slot.addon_label : null,
          addonPrice: slot.addon_enabled ? slot.addon_price_kobo : null,
        });
        return { ok: true as const };
      } catch (err) {
        // One dish failing (e.g. a future capacity guard) shouldn't fail the whole run.
        return {
          ok: false as const,
          subscriptionId: slot.subscription_id,
          dishKey: dish.dish_key,
          reason: err instanceof Error ? err.message : "unknown",
        };
      }
    }),
  );

  let created = 0;
  const skipped: { subscriptionId: string; dishKey: string; reason: string }[] = [];
  for (const r of results) {
    if (r.ok) created += 1;
    else skipped.push(r);
  }

  return NextResponse.json({ created, skipped });
}
