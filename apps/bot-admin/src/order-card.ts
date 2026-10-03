import { formatKobo } from "@29foods/core";
import { getServiceClient } from "./supabase";

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function placeLabel(lodge: string, room: string | null): string {
  return room ? `${lodge}, ${/^\d/.test(room) ? `Room ${room}` : room}` : lodge;
}

/**
 * The kitchen's ticket for one order (Telegram HTML). The customer's name leads, in
 * capitals, because it's what gets written on the pack. Anything that changes what the
 * customer pays or gets — a spin prize, wallet money, a remembered note — is spelled out
 * so nobody has to wonder why a total looks low or a free item appeared.
 */
export async function buildOrderCard(orderId: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;

  const [{ data: user }, { data: win }] = await Promise.all([
    supabase.from("users").select("name, phone").eq("id", order.user_id).maybeSingle(),
    order.spin_win_id
      ? supabase.from("spin_wins").select("prize_label").eq("id", order.spin_win_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const name = user?.name?.trim() || "Customer";
  const items = order.items as unknown as { name: string; qty: number }[];
  const lines = [
    `🔔 New order #${order.id.slice(0, 8)}`,
    `👤 <b>${escapeHtml(name.toUpperCase())}</b>${user?.phone ? ` · ☎️ ${escapeHtml(user.phone)}` : ""}`,
    escapeHtml(items.map((i) => `${i.qty}x ${i.name}`).join(", ")),
    `📍 ${escapeHtml(placeLabel(order.lodge, order.room))}`,
  ];
  if (order.note) lines.push(`📝 <b>${escapeHtml(order.note)}</b>`);
  if (win) {
    lines.push(`🎡 Spin prize: ${escapeHtml(win.prize_label)}${order.discount > 0 ? ` (−${formatKobo(order.discount)})` : ""}`);
  } else if (order.discount > 0) {
    lines.push(`🏷️ Discount: −${formatKobo(order.discount)}`);
  }
  if (order.wallet_paid > 0) {
    const rest = order.total - order.wallet_paid;
    lines.push(`👛 Wallet ${formatKobo(order.wallet_paid)}${rest > 0 ? ` + card/transfer ${formatKobo(rest)}` : ""}`);
  }
  lines.push(`💰 ${formatKobo(order.total)} · ${order.payment_status === "paid" ? "PAID ✅" : order.payment_status.toUpperCase()} · ${order.channel === "telegram" ? "Telegram" : "Web"}`);
  return lines.join("\n");
}
