import { resolveOrCreateUserByTelegram, stockCountFromEmbed } from "@29foods/core";
import { getServiceClient } from "./supabase";
import type { MyContext } from "./bot-context";

export type UserRow = Awaited<ReturnType<typeof resolveOrCreateUserByTelegram>>;

export async function getUser(ctx: MyContext, sourceQr?: string): Promise<UserRow> {
  return resolveOrCreateUserByTelegram(getServiceClient(), {
    telegramId: ctx.from!.id,
    name: ctx.from!.first_name ?? null,
    sourceQr,
  });
}

export interface MenuEntry {
  id: string;
  name: string;
  price: number;
  category: string;
  isHero: boolean;
  stock: number;
}

export const CATEGORY_ORDER = ["rice", "swallow", "protein", "snack", "drink"];
export const CATEGORY_LABELS: Record<string, string> = {
  rice: "🍚 Rice",
  swallow: "🍲 Swallow",
  protein: "🍗 Protein",
  snack: "🥟 Snacks",
  drink: "🥤 Drinks",
};
/** Categories that count as "the main thing" for the add-on moment. */
export const MAIN_CATEGORIES = ["rice", "swallow"];

/** Every listed item with live stock. Unavailable items are hidden; out-of-stock ones are kept (shown as sold out). */
export async function fetchMenu(): Promise<MenuEntry[]> {
  const { data, error } = await getServiceClient()
    .from("menu_items")
    .select("id, name, price, category, is_hero, is_available, inventory(stock_count)")
    .eq("is_available", true);
  if (error) throw error;
  return (data ?? [])
    .map((m) => ({ id: m.id, name: m.name, price: m.price, category: m.category, isHero: m.is_hero, stock: stockCountFromEmbed(m.inventory) }))
    .sort((a, b) => Number(b.isHero) - Number(a.isHero) || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name));
}

export async function lookupLodgeName(qrCode: string): Promise<string | null> {
  const { data } = await getServiceClient().from("qr_codes").select("lodge_name").eq("qr_code", qrCode).maybeSingle();
  return data?.lodge_name ?? null;
}
