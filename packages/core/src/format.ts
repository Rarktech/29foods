const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Formats an integer kobo amount (as stored in the DB) as a naira display string, e.g. 150000 -> "₦1,500". */
export function formatKobo(kobo: number): string {
  return nairaFormatter.format(kobo / 100);
}
