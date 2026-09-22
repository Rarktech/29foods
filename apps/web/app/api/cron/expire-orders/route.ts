import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { releaseOrderStock, expirePendingSubscription } from "@29foods/core";

// Vercel Cron target — releases reserved stock for orders whose payment window expired
// without a successful webhook (abandoned checkout, failed payment, etc), and cancels
// subscriptions stuck in the same unpaid state. One route, two near-identical sweeps —
// not worth a second cron job entry for a nearly-identical concern.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getSupabaseServiceClient();

  const { data: expiredOrders, error: ordersError } = await service
    .from("orders")
    .select("id")
    .eq("payment_status", "pending")
    .lt("expires_at", new Date().toISOString());
  if (ordersError) throw ordersError;
  // Each call is scoped to its own order/inventory rows — Postgres serializes any
  // actual row contention internally, so firing them concurrently is safe and keeps
  // this sweep's runtime flat as the number of expired orders grows.
  await Promise.all((expiredOrders ?? []).map((order) => releaseOrderStock(service, order.id)));
  if (expiredOrders?.length) revalidatePath("/"); // stock just came back — refresh the cached menu

  const { data: expiredSubscriptions, error: subscriptionsError } = await service
    .from("subscriptions")
    .select("id")
    .eq("status", "pending_payment")
    .lt("expires_at", new Date().toISOString());
  if (subscriptionsError) throw subscriptionsError;
  await Promise.all((expiredSubscriptions ?? []).map((subscription) => expirePendingSubscription(service, subscription.id)));

  return NextResponse.json({ ordersReleased: expiredOrders?.length ?? 0, subscriptionsExpired: expiredSubscriptions?.length ?? 0 });
}
