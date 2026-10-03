import { randomUUID } from "node:crypto";
import { Bot, InlineKeyboard } from "grammy";
import {
  formatKobo,
  calculateDeliveryFee,
  createOrderWithReservation,
  OutOfStockError,
  InsufficientWalletError,
  initiateFlutterwavePayment,
  getActiveSpinWin,
  applySpinWin,
  payOrderFullyFromWallet,
  countRecentTransferPayments,
  isKitchenOpen,
  compactId,
  expandId,
  type CartItem,
  type AppliedSpinWin,
} from "@29foods/core";
import { getServiceClient } from "../supabase";
import { fetchMenu, getUser, type MenuEntry, type UserRow } from "../data";
import { clearButtons } from "../ui";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";
import type { CartLine } from "../session";
import { deliveryAddress, startDelivery } from "./delivery";

export function registerCheckoutHandlers(bot: Bot<MyContext>) {
  bot.callbackQuery("checkout:summary", async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    await showSummary(ctx);
  });

  bot.callbackQuery(/^pay:(link|link_now|wallet)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    const mode = ctx.match[1] as "link" | "link_now" | "wallet";
    if (mode === "link" && (await maybeNudgeWallet(ctx))) return;
    await placeOrder(ctx, mode === "wallet" ? "wallet" : "link");
  });

  bot.callbackQuery(/^swap:([\w-]{22}):([\w-]{22}|rm)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    const oldId = expandId(ctx.match[1]!);
    const newId = ctx.match[2] === "rm" ? "rm" : expandId(ctx.match[2]!);
    const line = ctx.session.cart.find((l) => l.menuItemId === oldId);
    ctx.session.cart = ctx.session.cart.filter((l) => l.menuItemId !== oldId);
    if (newId !== "rm") {
      const item = (await fetchMenu()).find((m) => m.id === newId && m.stock > 0);
      if (item) ctx.session.cart.push({ menuItemId: item.id, name: item.name, unitPrice: item.price, qty: line?.qty ?? 1, category: item.category });
    }
    if (ctx.session.cart.length === 0) {
      await ctx.reply(copy.emptyCart, { reply_markup: new InlineKeyboard().text("🍚 See the menu", "menu:home") });
      return;
    }
    await showSummary(ctx);
  });
}

interface Quote {
  user: UserRow;
  lines: CartLine[];
  orderItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  prize: (AppliedSpinWin & { winId: string }) | null;
  discount: number;
  note: string | null;
  total: number;
}

type QuoteResult = { ok: true; quote: Quote } | { ok: false; soldOut: CartLine; alternative: MenuEntry | null };

/**
 * Prices and stock re-read from the database at every step that shows or charges a
 * total — the session cart is only what the user picked, never the source of truth.
 */
async function buildQuote(ctx: MyContext, user: UserRow): Promise<QuoteResult> {
  const menu = await fetchMenu();
  const lines: CartLine[] = [];
  for (const line of ctx.session.cart) {
    const entry = menu.find((m) => m.id === line.menuItemId);
    if (!entry || entry.stock < line.qty) {
      const alternative =
        menu.find((m) => m.category === line.category && m.stock > 0 && !ctx.session.cart.some((l) => l.menuItemId === m.id)) ?? null;
      return { ok: false, soldOut: line, alternative };
    }
    lines.push({ ...line, name: entry.name, unitPrice: entry.price });
  }
  ctx.session.cart = lines;

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const deliveryFee = calculateDeliveryFee(subtotal);
  const orderItems: CartItem[] = lines.map((l) => ({ menu_item_id: l.menuItemId, name: l.name, qty: l.qty, unit_price: l.unitPrice }));

  // Spin wins surface right before payment, applied automatically — never something to go find.
  let prize: Quote["prize"] = null;
  const win = await getActiveSpinWin(getServiceClient(), user.id);
  if (win) {
    const applied = applySpinWin(win, subtotal, deliveryFee);
    if (applied.freeItemName) {
      const free = menu.find((m) => m.name.toLowerCase().startsWith(applied.freeItemName!.toLowerCase()) && m.stock > 0);
      // Out of stock right now: keep the win for a later order rather than burning it.
      if (free) {
        orderItems.push({ menu_item_id: free.id, name: `${free.name} (spin prize)`, qty: 1, unit_price: 0 });
        prize = { ...applied, winId: win.id };
      }
    } else {
      prize = { ...applied, winId: win.id };
    }
  }

  const discount = Math.min(prize?.discount ?? 0, subtotal + deliveryFee);
  const note = [user.dietary_note, prize?.kitchenNote].filter(Boolean).join(" · ") || null;
  return { ok: true, quote: { user, lines, orderItems, subtotal, deliveryFee, prize, discount, note, total: subtotal + deliveryFee - discount } };
}

/** One message, one total, then how to pay. The wallet option only appears when there's a balance to show. */
export async function showSummary(ctx: MyContext) {
  if (ctx.session.cart.length === 0) {
    await ctx.reply(copy.emptyCart, { reply_markup: new InlineKeyboard().text("🍚 See the menu", "menu:home") });
    return;
  }
  if (!isKitchenOpen()) {
    await ctx.reply(copy.kitchenClosed(), { reply_markup: new InlineKeyboard().text("🔔 Remind me", "remind:open") });
    return;
  }
  const user = await getUser(ctx);
  const address = deliveryAddress(ctx, user);
  if (!address) return startDelivery(ctx);

  const result = await buildQuote(ctx, user);
  if (!result.ok) return offerSwap(ctx, result.soldOut, result.alternative);
  const q = result.quote;

  const text = copy.summary({
    items: q.lines,
    place: copy.placeLabel(address.lodge, address.room),
    subtotal: q.subtotal,
    deliveryFee: q.deliveryFee,
    prize: q.prize,
    note: q.note,
    total: q.total,
  });

  const balance = user.wallet_balance;
  const keyboard = new InlineKeyboard();
  if (q.total === 0) {
    keyboard.text("✅ Place order", "pay:wallet");
    await ctx.reply(text, { reply_markup: keyboard });
    return;
  }
  if (balance >= q.total) {
    keyboard.text(`👛 Pay from wallet (${formatKobo(balance)} available)`, "pay:wallet").row().text("💳 Pay now (card/transfer)", "pay:link");
    await ctx.reply(text, { reply_markup: keyboard });
    return;
  }
  if (balance > 0) {
    keyboard
      .text(`👛 Use wallet + pay ${formatKobo(q.total - balance)}`, "pay:wallet")
      .row()
      .text(`💳 Pay all ${formatKobo(q.total)} by card/transfer`, "pay:link");
    await ctx.reply(`${text}\n\n${copy.walletPartial(balance, q.total - balance)}`, { reply_markup: keyboard });
    return;
  }
  keyboard.text("💳 Pay now", "pay:link");
  await ctx.reply(text, { reply_markup: keyboard });
}

async function offerSwap(ctx: MyContext, soldOut: CartLine, alternative: MenuEntry | null) {
  const keyboard = new InlineKeyboard();
  // Compact ids: two full UUIDs would overflow Telegram's 64-byte callback_data limit.
  if (alternative) keyboard.text(`Switch to ${alternative.name}`, `swap:${compactId(soldOut.menuItemId)}:${compactId(alternative.id)}`).row();
  keyboard.text(alternative ? "Just remove it" : "Remove it", `swap:${compactId(soldOut.menuItemId)}:rm`).row().text("🍚 See the menu", "menu:home");
  await ctx.reply(copy.soldOutMidOrder(soldOut.name, alternative?.name ?? null), { reply_markup: keyboard });
}

/** After 2+ card/transfer orders this week, offer the wallet once per order instead of another payment link. */
async function maybeNudgeWallet(ctx: MyContext): Promise<boolean> {
  if (ctx.session.walletNudgeShown) return false;
  const user = await getUser(ctx);
  const recent = await countRecentTransferPayments(getServiceClient(), user.id);
  if (recent < 2) return false;
  const result = await buildQuote(ctx, user);
  if (!result.ok) return false;
  ctx.session.walletNudgeShown = true;
  await ctx.reply(copy.walletNudge(recent + 1, result.quote.total), {
    reply_markup: new InlineKeyboard().text("👛 Fund wallet", "wallet:fund").text("Just pay this one", "pay:link_now"),
  });
  return true;
}

async function placeOrder(ctx: MyContext, mode: "link" | "wallet") {
  if (ctx.session.cart.length === 0) {
    await ctx.reply(copy.startOver, { reply_markup: new InlineKeyboard().text("🍚 See the menu", "menu:home") });
    return;
  }
  const supabase = getServiceClient();
  const user = await getUser(ctx);
  const address = deliveryAddress(ctx, user);
  if (!address) return startDelivery(ctx);

  const result = await buildQuote(ctx, user);
  if (!result.ok) return offerSwap(ctx, result.soldOut, result.alternative);
  const q = result.quote;

  const walletAmount = mode === "wallet" ? Math.min(user.wallet_balance, q.total) : 0;
  const txRef = `29foods_${randomUUID()}`;

  let order;
  try {
    order = await createOrderWithReservation(supabase, {
      userId: user.id,
      items: q.orderItems,
      lodge: address.lodge,
      room: address.room,
      deliveryFee: q.deliveryFee,
      channel: "telegram",
      sourceQr: ctx.session.sourceQr,
      txRef,
      discount: q.discount,
      walletAmount,
      spinWinId: q.prize?.winId ?? null,
      note: q.note,
    });
  } catch (err) {
    if (err instanceof OutOfStockError || err instanceof InsufficientWalletError) return showSummary(ctx);
    throw err;
  }
  ctx.session.pendingOrderId = order.id;

  // Fully covered by the wallet: no external link at all. The Realtime listener sends
  // "Paid from wallet, balance now …" and the spin as soon as the order flips to paid.
  if (walletAmount === order.total) {
    await payOrderFullyFromWallet(supabase, order.id);
    return;
  }

  const amountDue = order.total - walletAmount;
  const { paymentLink } = await initiateFlutterwavePayment({
    txRef,
    amountNaira: amountDue / 100,
    customerEmail: user.email ?? `telegram-${user.telegram_id}@29foods.app`,
    customerName: user.name,
    customerPhone: user.phone,
    redirectUrl: `https://t.me/${ctx.me.username}?start=paid_${order.id}`,
  });
  await ctx.reply(copy.payLink(amountDue), { reply_markup: new InlineKeyboard().url(`💳 Pay ${formatKobo(amountDue)}`, paymentLink) });
}

/** Where someone lands when Flutterwave redirects them back into the chat. */
export async function showOrderStatus(ctx: MyContext, orderId: string) {
  const user = await getUser(ctx);
  const { data: order } = await getServiceClient()
    .from("orders")
    .select("id, user_id, payment_status, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== user.id) {
    await ctx.reply(copy.startOver, { reply_markup: new InlineKeyboard().text("🍚 See the menu", "menu:home") });
    return;
  }
  const lines: Record<string, string> = {
    placed: "Still waiting on that payment to clear, usually under a minute. I'll message you here the moment it lands.",
    paid: "Payment's in ✅ Your order's heading to the kitchen.",
    preparing: copy.inKitchen(),
    ready: "Your food's ready, a rider's picking it up now 🏍️",
    out_for_delivery: copy.onTheWay(null),
    delivered: "That one's been delivered. Hope it hit the spot 😋",
    cancelled: "That order didn't go through, nothing was charged.",
  };
  await ctx.reply(lines[order.order_status] ?? lines.placed!);
}
