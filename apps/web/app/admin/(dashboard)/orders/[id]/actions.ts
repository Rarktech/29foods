"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { applyPendingStatusEvent, pickRiderForPickup } from "@29foods/core";
import type { Database } from "@29foods/supabase-client";

type OrderStatus = Database["public"]["Tables"]["orders"]["Row"]["order_status"];

async function assertAdmin() {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await session.from("admin_profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("Not an admin.");
  return user.id;
}

export async function changeOrderStatus(orderId: string, toStatus: OrderStatus) {
  const adminId = await assertAdmin();
  const service = getSupabaseServiceClient();

  const { data: event, error: insertError } = await service
    .from("order_status_events")
    .insert({
      order_id: orderId,
      actor_type: "admin",
      actor_id: adminId,
      to_status: toStatus,
      client_op_id: randomUUID(),
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  await applyPendingStatusEvent(service, event.id);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/dashboard");
}

export async function reassignRider(orderId: string, riderId: string | null) {
  await assertAdmin();
  const service = getSupabaseServiceClient();
  const { error } = await service.from("orders").update({ assigned_rider_id: riderId }).eq("id", orderId);
  if (error) throw error;
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/dashboard");
}

export async function autoAssignRider(orderId: string) {
  await assertAdmin();
  const service = getSupabaseServiceClient();

  const { data: order, error: orderError } = await service.from("orders").select("lodge").eq("id", orderId).single();
  if (orderError) throw orderError;

  const [{ data: riders }, { data: unpicked }] = await Promise.all([
    service.from("riders").select("*"),
    service.from("orders").select("*").eq("order_status", "ready").not("assigned_rider_id", "is", null),
  ]);

  const pick = pickRiderForPickup({ riders: riders ?? [], unpickedOrders: unpicked ?? [], newOrderLodge: order.lodge });
  if (!pick) throw new Error("No riders available right now.");

  const { error } = await service.from("orders").update({ assigned_rider_id: pick.riderId }).eq("id", orderId);
  if (error) throw error;

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/dashboard");
}

export async function logComplaint(orderId: string, userId: string, reason: string) {
  await assertAdmin();
  const service = getSupabaseServiceClient();
  const { error } = await service.from("feedback").insert({
    order_id: orderId,
    user_id: userId,
    reaction: "down",
    reason,
    status: "under_review",
  });
  if (error) throw error;
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/feedback");
}
