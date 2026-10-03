/**
 * Telegram caps a button's callback_data at 64 bytes, and a UUID is 36 — two of them
 * plus a prefix doesn't fit. These pack a UUID's 16 bytes into 22 base64url characters
 * and back. Pure JS (no Buffer) because this package is also bundled for the browser.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function compactId(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error(`Not a UUID: ${uuid}`);
  let bits = "";
  for (const ch of hex) bits += parseInt(ch, 16).toString(2).padStart(4, "0");
  bits = bits.padEnd(132, "0"); // 128 bits → 22 six-bit chars
  let out = "";
  for (let i = 0; i < 132; i += 6) out += ALPHABET[parseInt(bits.slice(i, i + 6), 2)];
  return out;
}

export function expandId(compact: string): string {
  if (!/^[A-Za-z0-9_-]{22}$/.test(compact)) throw new Error(`Not a compact id: ${compact}`);
  let bits = "";
  for (const ch of compact) bits += ALPHABET.indexOf(ch).toString(2).padStart(6, "0");
  let hex = "";
  for (let i = 0; i < 128; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A short random token for one-shot button ids (idempotency keys), 8 chars. */
export function shortOpId(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALPHABET[b % 64]).join("");
}
