"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { sendTelegramBroadcast } from "@29foods/core";

type Target = "all" | "lodge" | "zone" | "inactive_users";

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

export async function sendBroadcast(input: { message: string; target: Target; targetValue?: string }) {
  const adminId = await assertAdmin();
  const service = getSupabaseServiceClient();

  let query = service.from("users").select("telegram_id").not("telegram_id", "is", null);

  if (input.target === "lodge" && input.targetValue) {
    query = query.eq("lodge", input.targetValue);
  } else if (input.target === "zone" && input.targetValue) {
    const { data: qrCodes } = await service.from("qr_codes").select("qr_code").eq("zone", input.targetValue);
    const codes = (qrCodes ?? []).map((q) => q.qr_code);
    query = query.in("acquired_via_qr", codes.length > 0 ? codes : ["__none__"]);
  } else if (input.target === "inactive_users") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    query = query.or(`last_order_at.is.null,last_order_at.lt.${cutoff.toISOString()}`);
  }

  const { data: recipients, error } = await query;
  if (error) throw error;

  const chatIds = (recipients ?? []).map((r) => r.telegram_id).filter((id): id is number => id !== null);

  const botToken = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_CUSTOMER_BOT_TOKEN is not configured.");

  const sentCount = chatIds.length > 0 ? await sendTelegramBroadcast(botToken, chatIds, input.message) : 0;

  await service.from("broadcasts").insert({
    message: input.message,
    target: input.target,
    target_value: input.targetValue ?? null,
    sent_at: new Date().toISOString(),
    sent_count: sentCount,
    created_by: adminId,
  });

  revalidatePath("/admin/broadcasts");
  return { sentCount };
}
