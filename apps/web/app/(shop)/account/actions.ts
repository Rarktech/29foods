"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { updateProfile, linkPhoneToUser } from "@29foods/core";

export async function updateProfileAction(formData: FormData) {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const service = getSupabaseServiceClient();
  const { data: profile } = await service.from("users").select("id").eq("auth_uid", user.id).single();
  if (!profile) throw new Error("Profile not found.");

  const name = (formData.get("name") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;

  await updateProfile(service, profile.id, { name });
  if (phone) await linkPhoneToUser(service, profile.id, phone);

  revalidatePath("/account");
}
