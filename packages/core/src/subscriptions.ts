import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@29foods/supabase-client";
import type { DurationId, MealTime } from "./plans";

type Client = SupabaseClient<Database>;
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export interface SubscriptionSlotDishPayload {
  dish_key: string;
  dish_name: string;
  frequency_per_week: number;
  unit_price_kobo: number;
  scheduled_weekdays: number[];
}

export interface SubscriptionSlotPayload {
  meal_time: MealTime;
  addon_enabled: boolean;
  addon_label: string | null;
  addon_price_kobo: number | null;
  dishes: SubscriptionSlotDishPayload[];
}

/** Mirrors createOrderWithReservation's shape — one transactional insert covering subscription + slots + dishes. */
export async function createSubscriptionWithPendingPayment(
  supabase: Client,
  params: {
    userId: string;
    durationId: DurationId;
    numWeeks: number;
    lodge: string;
    room: string | null;
    startDate: string; // YYYY-MM-DD
    endDate: string;
    slots: SubscriptionSlotPayload[];
    foodSubtotal: number;
    deliveryTotal: number;
    total: number;
    deliveriesTotal: number;
    txRef: string;
  },
): Promise<SubscriptionRow> {
  const { data, error } = await supabase.rpc("create_subscription_with_pending_payment", {
    p_user_id: params.userId,
    p_duration_id: params.durationId,
    p_num_weeks: params.numWeeks,
    p_lodge: params.lodge,
    p_room: params.room,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_slots: params.slots as unknown as Json,
    p_food_subtotal: params.foodSubtotal,
    p_delivery_total: params.deliveryTotal,
    p_total: params.total,
    p_deliveries_total: params.deliveriesTotal,
    p_tx_ref: params.txRef,
  });
  if (error) throw error;
  return data;
}

/** Idempotent — safe to call more than once for the same subscription (e.g. a replayed webhook). */
export async function markSubscriptionPaid(supabase: Client, subscriptionId: string, txId: string): Promise<SubscriptionRow> {
  const { data, error } = await supabase.rpc("mark_subscription_paid", { p_subscription_id: subscriptionId, p_tx_id: txId });
  if (error) throw error;
  return data;
}

export async function expirePendingSubscription(supabase: Client, subscriptionId: string): Promise<void> {
  const { error } = await supabase.rpc("expire_pending_subscription", { p_subscription_id: subscriptionId });
  if (error) throw error;
}

/** Called by the daily fulfillment cron — turns one scheduled (subscription, dish, day) into a real paid order. */
export async function createSubscriptionDeliveryOrder(
  supabase: Client,
  params: {
    subscriptionId: string;
    dishKey: string;
    dishName: string;
    unitPrice: number;
    addonLabel: string | null;
    addonPrice: number | null;
  },
): Promise<OrderRow> {
  const { data, error } = await supabase.rpc("create_subscription_delivery_order", {
    p_subscription_id: params.subscriptionId,
    p_dish_key: params.dishKey,
    p_dish_name: params.dishName,
    p_unit_price: params.unitPrice,
    p_addon_label: params.addonLabel,
    p_addon_price: params.addonPrice,
  });
  if (error) throw error;
  return data;
}
