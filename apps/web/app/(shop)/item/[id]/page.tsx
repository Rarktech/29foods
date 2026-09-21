import { notFound } from "next/navigation";
import { createPublicClient } from "@29foods/supabase-client";
import { stockCountFromEmbed } from "@29foods/core";
import { ItemDetail } from "@/components/ItemDetail";
import { BESTSELLER_NAME } from "@/lib/menu-images";

export const revalidate = 0;

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createPublicClient();

  const { data: item } = await supabase
    .from("menu_items")
    .select("id, name, category, price, is_available, image_url, inventory(stock_count)")
    .eq("id", id)
    .maybeSingle();
  if (!item) notFound();

  const { data: upsell } = await supabase
    .from("menu_items")
    .select("id, name, price, image_url")
    .eq("name", "Fanta 35cl")
    .neq("id", id)
    .maybeSingle();

  return (
    <ItemDetail
      item={{
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        imageUrl: item.image_url,
        stockCount: stockCountFromEmbed(item.inventory),
        isAvailable: item.is_available,
      }}
      upsell={upsell ? { id: upsell.id, name: upsell.name, price: upsell.price, imageUrl: upsell.image_url } : null}
      isBestseller={item.name === BESTSELLER_NAME}
    />
  );
}
