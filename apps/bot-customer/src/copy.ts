import { formatKobo, KITCHEN_OPEN_HOUR, type TimeOfDay } from "@29foods/core";

/**
 * Every customer-facing line the bot sends. The filter for anything added here: if it
 * could appear in a bank's SMS alert, rewrite it. Say what actually happened, name the
 * real item and place, keep it the length a person would text. Moments that repeat
 * often get a few variants so the fifth order doesn't read like the first.
 */

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)]!;
}

export interface NamedLine {
  name: string;
  qty: number;
}

/** "Party Jollof + Fanta 35cl", "2× Party Jollof + Coke". */
export function itemsLabel(lines: NamedLine[]): string {
  return lines.map((l) => (l.qty > 1 ? `${l.qty}× ${l.name}` : l.name)).join(" + ");
}

export function placeLabel(lodge: string, room: string | null): string {
  return room ? `${lodge}, ${/^\d/.test(room) ? `Room ${room}` : room}` : lodge;
}

export function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}

// ── Stage 1–2: entry & the opening question ───────────────────────────────

export function welcomeFromQr(lodgeName: string): string {
  return `Hey! Welcome to 29Foods, ${lodgeName} 👋\nWhat are you eating today?`;
}

export function welcomeCold(): string {
  return "Hey! Welcome to 29Foods 👋\nWhat are you eating today?";
}

const TIME_OPENERS: Record<TimeOfDay, string[]> = {
  morning: ["Morning{name}! Breakfast sorted?", "Good morning{name} ☀️ Starting the day right?"],
  lunch: ["Hey{name}, lunch sorted?", "Hey{name} 👋 Lunchtime already?"],
  evening: ["Hey{name}, hungry again? 😄", "Evening{name}! Dinner time?"],
  late: ["Still up{name}? 🌙", "Late one{name}? We've got you."],
};

function withName(template: string, name: string | null): string {
  return template.replace("{name}", name ? ` ${name}` : "");
}

/** A returning user with a usual: skip the welcome, go straight to the shortcut. */
export function greetWithUsual(name: string | null, tod: TimeOfDay, usual: NamedLine[]): string {
  return `${withName(pick(TIME_OPENERS[tod]), name)}\n${itemsLabel(usual)} again, or something else today?`;
}

/** Returning, but not enough orders yet for a "usual". */
export function greetReturning(name: string | null, tod: TimeOfDay): string {
  return `${withName(pick(TIME_OPENERS[tod]), name)}\nWhat are you eating today?`;
}

/** 10+ days since the last order: don't assume an outdated usual. */
export function greetLapsed(name: string | null): string {
  return pick([
    `Hey${name ? ` ${name}` : ""}, we've missed you 👋 It's been a minute. What are you in the mood for?`,
    `${name ? `${name}! ` : ""}Long time 😄 Good to have you back. What are you eating today?`,
  ]);
}

export function kitchenClosed(): string {
  const open = KITCHEN_OPEN_HOUR > 12 ? `${KITCHEN_OPEN_HOUR - 12}pm` : `${KITCHEN_OPEN_HOUR}am`;
  return `Kitchen's closed for today, back tomorrow at ${open}. Want a reminder when we open?`;
}

export const reminderSet = "Done, I'll ping you the moment we open 🔔";
export const kitchenOpenReminder = "Kitchen's open 🍳 What are you eating today?";

// ── Stage 3: menu ─────────────────────────────────────────────────────────

export function menuIntro(): string {
  return pick(["Here's what's ready right now:", "Fresh out of the kitchen right now:", "Here's what we've got right now:"]);
}

export const pickCategory = "What are you in the mood for?";
export const soldOutToast = "Sold out for now, sorry 😔";
export const nothingLeft = "We're all sold out right now 😔 Check back in a bit, the kitchen restocks through the day.";

export function categorySoldOut(label: string): string {
  return `${label} is all sold out right now 😔`;
}

export function added(name: string): string {
  return pick([`${name}, nice 👌 Anything else?`, `Got it, ${name} 🛒 Anything else?`, `${name} added. Anything else?`]);
}

// ── Stage 4: the add-on moment ────────────────────────────────────────────

export function upsell(params: { offer: { name: string; price: number }; soldOutName: string | null }): string {
  const lead = pick(["Good pick.", "Solid choice.", "Nice one."]);
  if (params.soldOutName) {
    return `${lead} Add a cold drink for ${formatKobo(params.offer.price)}? ${params.soldOutName}'s sold out right now but we've got ${params.offer.name}.`;
  }
  const noun = /rice|jollof|ofada/i.test(params.offer.name) ? "" : "cold ";
  return `${lead} Add a ${noun}${params.offer.name} for ${formatKobo(params.offer.price)}?`;
}

// ── Stage 6: delivery ─────────────────────────────────────────────────────

export function confirmSavedAddress(lodge: string, room: string | null): string {
  return `Still ${placeLabel(lodge, room)}?`;
}

export function askRoomAt(lodge: string, fromQr: boolean): string {
  return fromQr ? `Still ${lodge}, what room?` : `Which room at ${lodge}? (or a landmark)`;
}

export const askLodge = "Where should we bring it? Lodge name or area 📍";
export const askOneOffLodge = "No wahala. Where to this time? Lodge, hall or area 📍";

export function askOneOffRoom(place: string): string {
  return `And where at ${place}? Room number or a landmark.`;
}

export function reaskRoom(lodge: string): string {
  return `Didn't catch that, which room at ${lodge}?`;
}

export const reaskLodge = "Didn't catch that, which lodge or area?";
export const askPhone = 'Phone number, so the rider can call you when they\'re close? (or type "skip")';
export const badPhone = "That number doesn't look right, skipping it for now. You can add it next time.";

// ── Stage 7: summary & payment ────────────────────────────────────────────

export function summary(params: {
  items: NamedLine[];
  place: string;
  subtotal: number;
  deliveryFee: number;
  prize: { label: string; discount: number; freeItemName: string | null; kitchenNote: string | null } | null;
  note: string | null;
  total: number;
}): string {
  const lines = [itemsLabel(params.items), params.place, ""];
  lines.push(`Food: ${formatKobo(params.subtotal)}`);
  lines.push(`Delivery: ${params.deliveryFee === 0 ? "free" : formatKobo(params.deliveryFee)}`);
  if (params.prize) {
    if (params.prize.discount > 0) lines.push(`🎡 ${params.prize.label} from your spin: −${formatKobo(params.prize.discount)}`);
    else if (params.prize.freeItemName) lines.push(`🎡 Free ${params.prize.freeItemName} from your spin`);
    else if (params.prize.kitchenNote) lines.push(`🎡 Free chef's-choice item from your spin`);
  }
  if (params.note) lines.push(`📝 ${params.note}`);
  lines.push(`Total: ${formatKobo(params.total)}`);
  return lines.join("\n");
}

export function walletPartial(walletBalance: number, remaining: number): string {
  return `Wallet covers ${formatKobo(walletBalance)} of this, pay the remaining ${formatKobo(remaining)} by transfer?`;
}

export function walletNudge(nth: number, total: number): string {
  return `That's your ${ordinal(nth)} order paid by transfer this week, ${formatKobo(total)}. Want to fund your wallet instead so it's one tap from here on, no card each time?`;
}

export function payLink(amount: number): string {
  return `Tap below to pay ${formatKobo(amount)}, takes a second. I'll pick it up here the moment it clears.`;
}

export function soldOutMidOrder(name: string, alternative: string | null): string {
  return alternative
    ? `Ah, ${name} just sold out as you were ordering. ${alternative}'s still available, want to switch?`
    : `Ah, ${name} just sold out as you were ordering 😔 Want to pick something else?`;
}

export function paymentFailed(walletRefund: number): string {
  const refund = walletRefund > 0 ? ` The ${formatKobo(walletRefund)} from your wallet is back in it.` : "";
  return `That payment didn't go through, nothing was charged.${refund} Want to try again?`;
}

export function abandonedCart(itemName: string): string {
  return `Still thinking about that ${itemName}? It's still available.`;
}

export const readyWhenYouAre = "Ready when you are 😋";
export const emptyCart = "Your cart's empty. What are you eating today?";
export const startOver = "Lost track of that one 🙈 Let's start again:";

// ── Wallet ────────────────────────────────────────────────────────────────

export function walletScreen(balance: number): string {
  return balance > 0
    ? `Your wallet balance: ${formatKobo(balance)}`
    : "Your wallet's empty right now. Fund it once and every order after is a single tap, no card, no transfer.";
}

export const pickTopup = "How much do you want to add?";

export function askTopupAmount(min: number, max: number): string {
  return `Type the amount, e.g. 4000 or 7.5k (${formatKobo(min)} to ${formatKobo(max)}).`;
}

export function badTopupAmount(min: number, max: number): string {
  return `That doesn't look like an amount 🙈 Just the number, like 4000, between ${formatKobo(min)} and ${formatKobo(max)}.`;
}

export function topupOutOfRange(min: number, max: number): string {
  return `Top-ups need to be between ${formatKobo(min)} and ${formatKobo(max)}. What amount?`;
}

export function topupLink(amount: number): string {
  return `Tap below to add ${formatKobo(amount)}, takes a second:`;
}

export function walletFunded(amount: number, balance: number): string {
  return `Wallet funded, ${formatKobo(amount)} added 👛 Balance: ${formatKobo(balance)}.`;
}

export function payPendingFromWallet(items: NamedLine[]): string {
  return `Your ${itemsLabel(items)} is still waiting, pay for it from your wallet?`;
}

// ── Stage 5: spin ─────────────────────────────────────────────────────────

export function paidSpinPrompt(walletBalanceAfter: number | null): string {
  return walletBalanceAfter !== null
    ? `Paid from wallet, balance now ${formatKobo(walletBalanceAfter)}.\n🎡 Spin for your bonus`
    : "Payment confirmed! 🎡 Spin for your bonus";
}

export const spinAgain = "Ooh, the wheel says go again 👀";
export const alreadySpun = "You've already spun for this order 😄";

export function spinResult(prizeKey: string, copy: string): string {
  const big = prizeKey === "SPIN20" || prizeKey === "SPIN1000";
  return `${big ? "🎉 No way! " : "🎁 "}${copy} Valid for the next 6 hours.`;
}

// ── Stage 8: confirmation ─────────────────────────────────────────────────

export function orderConfirmed(items: NamedLine[], place: string, total: number): string {
  return `Order confirmed! ${itemsLabel(items)}\n${place} · ${formatKobo(total)}\n⏱️ Your food arrives in 30 minutes or less`;
}

export const broadcastWelcome = "You'll get our daily menu drops here too. Not your thing? /stop anytime.";

// ── Stage 9: status updates ───────────────────────────────────────────────

export function inKitchen(): string {
  return pick(["Your order's in the kitchen now 🍳", "Kitchen's on it now 🍳", "Your food's being made right now 🍳"]);
}

export function onTheWay(riderName: string | null): string {
  return riderName ? `${riderName}'s got your food, on the way now 🏍️` : "Your food's on the way, should be with you soon 🏍️";
}

export function arrived(lodge: string): string {
  return `Your rider's at ${lodge} now 📍`;
}

export const noRiderYet =
  "Every rider's out on a delivery right now, yours will go out the moment one's free, probably about 10 extra minutes. Sorry for the wait 🙏";

// ── Stage 10: feedback ────────────────────────────────────────────────────

export const howWasIt = "How was it?";
export const feedbackFire = "Glad you enjoyed it. We'll be here tomorrow too 👋";
export const feedbackNeutral = "Thanks for telling us. We'll do better next time 🙏";
export const feedbackDown = "Sorry about that 😔 What went wrong? (just type it, or ignore this)";
export const feedbackReasonThanks = "Thank you. Someone from the kitchen will look at this today.";

// ── Free text ─────────────────────────────────────────────────────────────

export function didYouMean(name: string): string {
  return `${name}, that one?`;
}

export function dietSaved(note: string): string {
  return `Got it, ${note}. I'll pass that to the kitchen on every order from now on 👍`;
}

export const notSure = "Not sure I got that 🙈 Tap one of these:";

export const stopped = "Done, no more menu drops. Your orders and updates still come through as normal. /resume to turn them back on.";
export const resumed = "You're back on the daily menu drops 🙌";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}
