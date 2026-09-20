export interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number; // kobo
  qty: number;
}

export interface SessionData {
  cart: CartLine[];
  lodge: string | null;
  room: string | null;
  sourceQr: string | null;
  /** Which free-text reply we're currently expecting, if any. */
  awaitingInput: "lodge" | "room" | "phone" | null;
  upsellShown: boolean;
}

export function initialSession(): SessionData {
  return { cart: [], lodge: null, room: null, sourceQr: null, awaitingInput: null, upsellShown: false };
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}
