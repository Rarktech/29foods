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
}

export async function createRider(input: { name: string; phone: string | null; assignedBike: string | null }) {
  await assertAdmin();
  const service = getSupabaseServiceClient();
  const { error } = await service.from("riders").insert({
    name: input.name,
    phone: input.phone,
    assigned_bike: input.assignedBike,
  });
  if (error) throw error;
  revalidatePath("/admin/riders");
}

export async function updateRiderStatus(riderId: string, cycleStatus: "at_base" | "heading_back" | "out_delivering" | "offline") {
  await assertAdmin();
  const service = getSupabaseServiceClient();
  const { error } = await service.from("riders").update({ cycle_status: cycleStatus }).eq("id", riderId);
  if (error) throw error;
  revalidatePath("/admin/riders");
}
