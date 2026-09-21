export const DELIVERY_FEE_KOBO = 30000; // ₦300
export const FREE_DELIVERY_THRESHOLD_KOBO = 500000; // ₦5,000

/** Authoritative delivery-fee calc, shared by every surface that creates an order. */
export function calculateDeliveryFee(subtotalKobo: number): number {
  return subtotalKobo >= FREE_DELIVERY_THRESHOLD_KOBO ? 0 : DELIVERY_FEE_KOBO;
}
