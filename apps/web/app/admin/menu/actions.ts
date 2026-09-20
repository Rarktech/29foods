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

export async function updateMenuItem(id: string, update: { price?: number; is_available?: boolean }) {
  await assertAdmin();
  const service = getSupabaseServiceClient();
  const { error } = await service.from("menu_items").update(update).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function updateStock(menuItemId: string, stockCount: number) {
  await assertAdmin();
  const service = getSupabaseServiceClient();
  const { error } = await service.from("inventory").update({ stock_count: Math.max(0, stockCount) }).eq("menu_item_id", menuItemId);
  if (error) throw error;
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function createMenuItem(input: {
  name: string;
  category: "rice" | "protein" | "drink" | "snack";
  price: number;
  stockCount: number;
}) {
  await assertAdmin();
  const service = getSupabaseServiceClient();

  const { data: item, error } = await service
    .from("menu_items")
    .insert({ name: input.name, category: input.category, price: input.price, is_available: true })
    .select("id")
    .single();
  if (error) throw error;

  await service.from("inventory").insert({ menu_item_id: item.id, stock_count: input.stockCount });
  revalidatePath("/admin/menu");
  revalidatePath("/");
}
