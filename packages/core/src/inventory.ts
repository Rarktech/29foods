import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@29foods/supabase-client";

type Client = SupabaseClient<Database>;
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export interface CartItem {
  menu_item_id: string;
  name: string;
  qty: number;
  unit_price: number; // kobo
  addons?: string[];
  /** Which named basket this line belongs to, for multi-person orders sharing one drop-off. */
  basket_label?: string;
}

export class OutOfStockError extends Error {
  constructor(public menuItemId: string) {
    super(`OUT_OF_STOCK: ${menuItemId}`);
  }
}

export class InsufficientWalletError extends Error {
  constructor() {
    super("INSUFFICIENT_WALLET");
  }
}

/**
 * Atomically reserves stock for every line item and creates the order in one
 * transaction (see create_order_with_reservation in the schema migration) —
 * this is what prevents overselling under concurrent orders. Reservation
 * happens here, at order creation, not at payment confirmation.
 */
export async function createOrderWithReservation(
  supabase: Client,
  params: {
    userId: string;
    items: CartItem[];
    lodge: string;
    room: string | null;
    deliveryFee: number;
    channel: "web" | "telegram";
    sourceQr: string | null;
    txRef: string;
    /** Kobo off the total (e.g. a spin win). */
    discount?: number;
    /** Kobo held from the user's wallet at creation; refunded if the order is released. */
    walletAmount?: number;
    spinWinId?: string | null;
    /** Kitchen note, e.g. a remembered "no pepper". */
    note?: string | null;
  },
): Promise<OrderRow> {
  const { data, error } = await supabase.rpc("create_order_with_reservation", {
    p_user_id: params.userId,
    p_items: params.items as unknown as Json,
    p_lodge: params.lodge,
    p_room: params.room,
    p_delivery_fee: params.deliveryFee,
    p_channel: params.channel,
    p_source_qr: params.sourceQr,
    p_tx_ref: params.txRef,
    p_discount: params.discount ?? 0,
    p_wallet_amount: params.walletAmount ?? 0,
    p_spin_win_id: params.spinWinId ?? null,
    p_note: params.note ?? null,
  });

  if (error) {
    if (error.message.includes("OUT_OF_STOCK")) {
      const menuItemId = error.message.split("OUT_OF_STOCK: ")[1]?.trim() ?? "unknown";
      throw new OutOfStockError(menuItemId);
    }
    if (error.message.includes("INSUFFICIENT_WALLET")) throw new InsufficientWalletError();
    throw error;
  }
  return data;
}

/** Releases a reserved order's stock back to inventory. No-op if already paid/cancelled. */
export async function releaseOrderStock(supabase: Client, orderId: string): Promise<void> {
  const { error } = await supabase.rpc("release_order_stock", { p_order_id: orderId });
  if (error) throw error;
}

/** Idempotent — safe to call more than once for the same order (e.g. a replayed webhook). */
export async function markOrderPaid(supabase: Client, orderId: string, txId: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc("mark_order_paid", { p_order_id: orderId, p_tx_id: txId });
  if (error) throw error;
  return data;
}
