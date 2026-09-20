export const DELIVERY_FEE_KOBO = 30000; // ₦300
export const FREE_DELIVERY_THRESHOLD_KOBO = 300000; // ₦3,000

/** Authoritative fee calc — mirrored client-side only for the checkout preview, never trusted from the client. */
export function calculateDeliveryFee(subtotalKobo: number): number {
  return subtotalKobo >= FREE_DELIVERY_THRESHOLD_KOBO ? 0 : DELIVERY_FEE_KOBO;
}
