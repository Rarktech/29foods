export interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number; // kobo
  qty: number;
  category: string;
}

export interface Address {
  lodge: string;
  room: string | null;
}

/** Which free-text reply we're currently expecting, if any. */
export type Step = "lodge" | "room" | "oneoff_lodge" | "oneoff_room" | "phone" | "feedback_reason" | "topup_amount";

export interface SessionData {
  cart: CartLine[];
  sourceQr: string | null;
  /** Lodge name resolved from the QR the user arrived through, if any. */
  qrLodge: string | null;
  step: Step | null;
  /** Lodge typed while capturing an address, waiting for its room. */
  draftLodge: string | null;
  /** A "deliver somewhere else" address for this order only — never written to the profile. */
  oneOff: Address | null;
  /** Whether the bad-input re-ask has been used for the current step (ask once, then accept). */
  reasked: boolean;
  /** The add-on question has been asked (or answered) for this order. */
  upsellDone: boolean;
  /** The "fund your wallet instead?" nudge has been shown for this order. */
  walletNudgeShown: boolean;
  /** Order created and waiting on payment. */
  pendingOrderId: string | null;
  /** The one abandoned-cart nudge has been sent for this cart. */
  nudgeSent: boolean;
  feedbackOrderId: string | null;
}

export function initialSession(): SessionData {
  return {
    cart: [],
    sourceQr: null,
    qrLodge: null,
    step: null,
    draftLodge: null,
    oneOff: null,
    reasked: false,
    upsellDone: false,
    walletNudgeShown: false,
    pendingOrderId: null,
    nudgeSent: false,
    feedbackOrderId: null,
  };
}

/** Resets everything tied to one order, keeping where the user came from. */
export function resetOrderState(session: SessionData) {
  session.cart = [];
  session.step = null;
  session.draftLodge = null;
  session.oneOff = null;
  session.reasked = false;
  session.upsellDone = false;
  session.walletNudgeShown = false;
  session.pendingOrderId = null;
  session.nudgeSent = false;
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}
