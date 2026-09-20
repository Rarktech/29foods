import { createPublicClient } from "@29foods/supabase-client";
import { CartView } from "@/components/CartView";

export const revalidate = 0;

export default async function CartPage() {
  const supabase = createPublicClient();
  const { data: drinks } = await supabase
    .from("menu_items")
    .select("id, name, price, image_url, is_available, inventory(stock_count)")
    .eq("category", "drink")
    .eq("is_available", true);

  const upsell = (drinks ?? [])
    .filter((d) => (Array.isArray(d.inventory) ? (d.inventory[0]?.stock_count ?? 0) : 0) > 0)
    .map((d) => ({ id: d.id, name: d.name, price: d.price, imageUrl: d.image_url }))[0];

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="mb-6 text-2xl font-bold">Your cart</h1>
      <CartView upsell={upsell ?? null} />
    </main>
  );
}
