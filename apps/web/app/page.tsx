import { createPublicClient } from "@29foods/supabase-client";
import { MenuGrid, type MenuItemWithStock } from "@/components/MenuGrid";
import { QrAttributionCapture } from "@/components/QrAttributionCapture";
import { CartBar } from "@/components/CartBar";

export const revalidate = 0; // stock changes live — never cache this page

export default async function HomePage({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  const supabase = createPublicClient();

  const { data: items, error } = await supabase
    .from("menu_items")
    .select("id, name, category, price, is_available, image_url, inventory(stock_count)")
    .order("category");

  if (error) throw error;

  const menu: MenuItemWithStock[] = (items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    imageUrl: item.image_url,
    // inventory is a to-one relation via the primary key FK, but PostgREST returns it as an array
    stockCount: Array.isArray(item.inventory) ? (item.inventory[0]?.stock_count ?? 0) : 0,
    isAvailable: item.is_available,
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      {src && <QrAttributionCapture qrCode={src} />}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">What are you eating today? 😋</h1>
        <p className="text-neutral-500">Tap to add, checkout in under a minute.</p>
      </header>
      <MenuGrid items={menu} />
      <CartBar />
    </main>
  );
}
