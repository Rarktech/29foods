"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function updateOwnAdminName(name: string) {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const service = getSupabaseServiceClient();
  const { error } = await service.from("admin_profiles").update({ name }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/admin/dashboard");
}
