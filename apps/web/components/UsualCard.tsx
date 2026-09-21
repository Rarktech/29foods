import Image from "next/image";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { formatKobo } from "@/lib/format";
import { getMenuImage } from "@/lib/menu-images";
import { ReorderButton } from "@/components/ReorderButton";

interface OrderItemSnapshot {
  menu_item_id: string;
  name: string;
  qty: number;
  unit_price: number;
}

/** "Your usual" — a real reorder shortcut built from the viewer's own order history, hidden for first-time visitors. */
export async function UsualCard({ viewerId }: { viewerId: string | null }) {
  if (!viewerId) return null;

  const supabase = getSupabaseServiceClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("items")
    .eq("user_id", viewerId)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!orders || orders.length === 0) return null;

  const tally = new Map<string, { menuItemId: string; name: string; unitPrice: number; count: number }>();
  for (const order of orders) {
    const items = (order.items as unknown as OrderItemSnapshot[]) ?? [];
    for (const item of items) {
      const existing = tally.get(item.menu_item_id);
      if (existing) {
        existing.count += 1;
      } else {
        tally.set(item.menu_item_id, {
          menuItemId: item.menu_item_id,
          name: item.name,
          unitPrice: item.unit_price,
          count: 1,
        });
      }
    }
  }
  if (tally.size === 0) return null;

  const ranked = [...tally.values()].sort((a, b) => b.count - a.count);
  const top = ranked.slice(0, 2);
  const [primary] = top;
  if (!primary) return null;

  const label = top.map((t) => t.name).join(" + ");
  const price = top.reduce((sum, t) => sum + t.unitPrice, 0);
  const timesOrdered = Math.max(...top.map((t) => t.count));
  const image = getMenuImage(primary.name);
  const reorderItems = top.map(({ menuItemId, name, unitPrice }) => ({ menuItemId, name, unitPrice }));

  return (
    <div className="px-5 pb-[22px]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[17px] font-bold text-heading">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 2.1l4 4-4 4" />
            <path d="M3 12.6v-1a4 4 0 0 1 4-4h14" />
            <path d="M7 21.9l-4-4 4-4" />
            <path d="M21 11.4v1a4 4 0 0 1-4 4H3" />
          </svg>
          Your usual
        </h3>
      </div>
      <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3">
        {image ? (
          <Image src={image} alt={label} width={56} height={56} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-xl bg-border" />
        )}
        <div className="flex-grow">
          <div className="text-sm font-bold text-heading">{label}</div>
          <div className="mt-0.5 text-xs text-muted">
            Ordered {timesOrdered} time{timesOrdered === 1 ? "" : "s"} · {formatKobo(price)}
          </div>
        </div>
        <ReorderButton items={reorderItems} />
      </div>
    </div>
  );
}
