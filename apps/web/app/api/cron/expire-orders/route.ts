import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { releaseOrderStock } from "@29foods/core";

// Vercel Cron target — releases reserved stock for orders whose payment window expired
// without a successful webhook (abandoned checkout, failed payment, etc).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getSupabaseServiceClient();
  const { data: expired, error } = await service
    .from("orders")
    .select("id")
    .eq("payment_status", "pending")
    .lt("expires_at", new Date().toISOString());
  if (error) throw error;

  for (const order of expired ?? []) {
    await releaseOrderStock(service, order.id);
  }

  return NextResponse.json({ released: expired?.length ?? 0 });
}
