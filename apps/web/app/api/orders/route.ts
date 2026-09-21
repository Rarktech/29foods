import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createOrderWithReservation, OutOfStockError, linkPhoneToUser, initiateFlutterwavePayment, type CartItem } from "@29foods/core";
import { calculateDeliveryFee } from "@/lib/pricing";
import { PROTEIN_ADDONS } from "@/lib/protein-addons";

interface RequestBody {
  items: { menuItemId: string; qty: number; basketLabel?: string; addonId?: string }[];
  lodge: string;
  room: string | null;
  phone: string | null;
  sourceQr: string | null;
}

export async function POST(request: Request) {
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = (await request.json()) as RequestBody;
  if (!body.items?.length || !body.lodge?.trim()) {
    return NextResponse.json({ error: "Your cart or lodge is missing." }, { status: 400 });
  }

  const service = getSupabaseServiceClient();

  const { data: profile, error: profileError } = await service.from("users").select("*").eq("auth_uid", user.id).single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Could not find your account. Please sign in again." }, { status: 400 });
  }

  let currentProfile = profile;
  if (body.phone && body.phone.trim() && body.phone.trim() !== profile.phone) {
    try {
      currentProfile = await linkPhoneToUser(service, profile.id, body.phone.trim());
    } catch {
      return NextResponse.json({ error: "That phone number looks invalid." }, { status: 400 });
    }
  }

  // Never trust client-supplied prices — re-derive from the menu server-side.
  const menuItemIds = body.items.map((i) => i.menuItemId);
  const { data: menuItems, error: menuError } = await service
    .from("menu_items")
    .select("id, name, price, is_available")
    .in("id", menuItemIds);
  if (menuError) throw menuError;

  const menuById = new Map((menuItems ?? []).map((m) => [m.id, m]));
  const cartItems: CartItem[] = [];
  let subtotal = 0;
  for (const line of body.items) {
    const menuItem = menuById.get(line.menuItemId);
    if (!menuItem || !menuItem.is_available || line.qty <= 0) {
      return NextResponse.json({ error: `${menuItem?.name ?? "An item"} is no longer available.` }, { status: 409 });
    }
    // Protein add-ons are re-derived from the fixed PROTEIN_ADDONS list server-side — never trust a client-submitted price.
    const addon = line.addonId ? PROTEIN_ADDONS.find((a) => a.id === line.addonId) : undefined;
    const unitPrice = menuItem.price + (addon?.priceKobo ?? 0);
    cartItems.push({
      menu_item_id: menuItem.id,
      name: addon ? `${menuItem.name} — ${addon.label}` : menuItem.name,
      qty: line.qty,
      unit_price: unitPrice,
      basket_label: line.basketLabel,
    });
    subtotal += unitPrice * line.qty;
  }

  const deliveryFee = calculateDeliveryFee(subtotal);
  const txRef = `29foods_${randomUUID()}`;

  let order;
  try {
    order = await createOrderWithReservation(service, {
      userId: currentProfile.id,
      items: cartItems,
      lodge: body.lodge.trim(),
      room: body.room?.trim() || null,
      deliveryFee,
      channel: "web",
      sourceQr: body.sourceQr ?? currentProfile.acquired_via_qr,
      txRef,
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      const outOfStockItem = menuById.get(err.menuItemId);
      return NextResponse.json({ error: `${outOfStockItem?.name ?? "One item"} just sold out.` }, { status: 409 });
    }
    throw err;
  }

  const baseUrl = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? new URL(request.url).origin;
  const { paymentLink } = await initiateFlutterwavePayment({
    txRef,
    amountNaira: order.total / 100,
    customerEmail: currentProfile.email ?? user.email ?? "customer@29foods.app",
    customerName: currentProfile.name,
    customerPhone: currentProfile.phone,
    redirectUrl: `${baseUrl}/order/${order.id}`,
  });

  return NextResponse.json({ orderId: order.id, paymentLink });
}
