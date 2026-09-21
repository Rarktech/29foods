import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { MenuAdminTable } from "@/components/admin/MenuAdminTable";

export const revalidate = 0;

export default async function AdminMenuPage() {
  const service = getSupabaseServiceClient();
  const { data: items } = await service
    .from("menu_items")
    .select("id, name, category, price, is_available, inventory(stock_count, low_stock_threshold)")
    .order("category")
    .order("name");

  const rows = (items ?? []).map((item) => {
    // menu_item_id is both inventory's PK and its FK to menu_items, so PostgREST embeds it
    // as a single object (not an array) — handle both shapes defensively.
    const inv = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      isAvailable: item.is_available,
      stockCount: inv?.stock_count ?? 0,
      lowStockThreshold: inv?.low_stock_threshold ?? 5,
    };
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">Menu & Stock</h1>
      <MenuAdminTable items={rows} />
    </div>
  );
}
