"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

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

export async function resolveFeedback(feedbackId: string, resolution: string) {
  const adminId = await assertAdmin();
  const service = getSupabaseServiceClient();
  const { error } = await service
    .from("feedback")
    .update({ status: "resolved", resolution, resolved_at: new Date().toISOString(), resolved_by: adminId })
    .eq("id", feedbackId);
  if (error) throw error;
  revalidatePath("/admin/feedback");
}

export async function updateFeedbackStatus(feedbackId: string, status: "new" | "under_review" | "resolved") {
  await assertAdmin();
  const service = getSupabaseServiceClient();
  const { error } = await service.from("feedback").update({ status }).eq("id", feedbackId);
  if (error) throw error;
  revalidatePath("/admin/feedback");
}
