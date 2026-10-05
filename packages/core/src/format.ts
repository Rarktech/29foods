const wholeNairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const nairaWithKoboFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats an integer kobo amount (as stored in the DB) as a naira display string:
 * 150000 -> "₦1,500", 150050 -> "₦1,500.50". Kobo only shows when there is some, so
 * menu prices stay clean while a wallet funded with ₦5,000.50 never displays rounded.
 */
export function formatKobo(kobo: number): string {
  return kobo % 100 === 0 ? wholeNairaFormatter.format(kobo / 100) : nairaWithKoboFormatter.format(kobo / 100);
}

/**
 * Live formatting for a naira amount field as the user types: thousands separators on
 * the whole part, at most 2 decimal places, digits and one "." only. "10000.505" ->
 * "10,000.50", "007" -> "7". Keeps a trailing "." so typing "5000." isn't fought.
 */
export function formatNairaInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const fraction = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === null ? grouped : `${grouped || "0"}.${fraction}`;
}
