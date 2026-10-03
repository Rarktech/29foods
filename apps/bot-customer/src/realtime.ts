import { InlineKeyboard, type Bot } from "grammy";
import { getServiceClient } from "./supabase";
import { updateSession } from "./storage";
import { resetOrderState, type CartLine } from "./session";
import { sendConfirmation, sendFeedbackPrompt } from "./notify";
import * as copy from "./copy";
import type { MyContext } from "./bot-context";

const CONFIRM_FALLBACK_MS = 90_000; // confirmation still goes out if Spin is never tapped
const FEEDBACK_DELAY_MS = 2 * 60_000;

/** Orders that reached `ready` and when — the sweeper uses this for the "no rider yet" message. */
export const readySince = new Map<string, { at: number; chatId: number; warned: boolean }>();

const sent = new Set<string>();
function once(key: string): boolean {
  if (sent.has(key)) return false;
  sent.add(key);
  return true;
}

interface OrderPayload {
  id: string;
  user_id: string;
  total: number;
  wallet_paid: number;
  lodge: string;
  room: string | null;
  payment_status: string;
  order_status: string;
  assigned_rider_id: string | null;
}

/**
 * Stages 8–9: told, not asked. Every ping is driven by a real status change made by the
 * kitchen (bot-admin) or the rider (bot-rider), never a timer pretending to know.
 * Needs REPLICA IDENTITY FULL on orders so `old` carries the previous status.
 */
export function subscribeToOrderUpdates(bot: Bot<MyContext>) {
  const supabase = getServiceClient();

  supabase
    .channel("bot-customer-orders")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: "channel=eq.telegram" }, async (payload) => {
      try {
        await handleOrderUpdate(bot, payload.old as Partial<OrderPayload>, payload.new as OrderPayload);
      } catch (err) {
        console.error("order update notify failed:", err);
      }
    })
    .subscribe();

  supabase
    .channel("bot-customer-wallet")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallet_transactions" }, async (payload) => {
      const before = payload.old as { status?: string };
      const after = payload.new as { id: string; user_id: string; kind: string; status: string; amount: number };
      if (after.kind !== "topup" || before.status === "completed" || after.status !== "completed") return;
      if (!once(`topup:${after.id}`)) return;
      try {
        await handleTopupCompleted(bot, after.user_id, after.amount);
      } catch (err) {
        console.error("wallet topup notify failed:", err);
      }
    })
    .subscribe();
}

async function handleOrderUpdate(bot: Bot<MyContext>, before: Partial<OrderPayload>, after: OrderPayload) {
  const supabase = getServiceClient();
  const { data: user } = await supabase.from("users").select("telegram_id, wallet_balance").eq("id", after.user_id).maybeSingle();
  const chatId = user?.telegram_id;
  if (!chatId) return;

  if (before.payment_status !== "paid" && after.payment_status === "paid" && once(`paid:${after.id}`)) {
    await updateSession(chatId, resetOrderState);
    const fromWallet = after.wallet_paid === after.total;
    await bot.api.sendMessage(chatId, copy.paidSpinPrompt(fromWallet && after.total > 0 ? user.wallet_balance : null), {
      reply_markup: new InlineKeyboard().text("🎡 Spin", `spin:${after.id}`),
    });
    setTimeout(() => {
      sendConfirmation(bot.api, chatId, after.id).catch((err) => console.error("confirmation failed:", err));
    }, CONFIRM_FALLBACK_MS);
  }

  if (before.payment_status === "pending" && after.payment_status === "failed" && once(`failed:${after.id}`)) {
    // Only speak up if this is still the order they're waiting on — not an older abandoned one.
    let isCurrent = false;
    await updateSession(chatId, (s) => {
      isCurrent = s.pendingOrderId === after.id;
      if (isCurrent) s.pendingOrderId = null;
    });
    if (isCurrent) {
      await bot.api.sendMessage(chatId, copy.paymentFailed(after.wallet_paid), {
        reply_markup: new InlineKeyboard().text("🔄 Try again", "checkout:summary"),
      });
    }
  }

  if (before.order_status === after.order_status) return;

  if (after.order_status === "preparing" && once(`preparing:${after.id}`)) {
    await bot.api.sendMessage(chatId, copy.inKitchen());
  }

  if (after.order_status === "ready") readySince.set(after.id, { at: Date.now(), chatId, warned: false });
  else readySince.delete(after.id);

  if (after.order_status === "out_for_delivery" && once(`otw:${after.id}`)) {
    let riderName: string | null = null;
    if (after.assigned_rider_id) {
      const { data: rider } = await supabase.from("riders").select("name").eq("id", after.assigned_rider_id).maybeSingle();
      riderName = copy.firstName(rider?.name);
    }
    await bot.api.sendMessage(chatId, copy.onTheWay(riderName));
  }

  if (after.order_status === "delivered" && once(`delivered:${after.id}`)) {
    await bot.api.sendMessage(chatId, copy.arrived(after.lodge));
    setTimeout(() => {
      sendFeedbackPrompt(bot.api, chatId, after.id).catch((err) => console.error("feedback prompt failed:", err));
    }, FEEDBACK_DELAY_MS);
  }
}

async function handleTopupCompleted(bot: Bot<MyContext>, userId: string, amount: number) {
  const { data: user } = await getServiceClient().from("users").select("telegram_id, wallet_balance").eq("id", userId).maybeSingle();
  if (!user?.telegram_id) return;

  let cart: CartLine[] = [];
  await updateSession(user.telegram_id, (s) => {
    cart = s.cart;
  });

  await bot.api.sendMessage(user.telegram_id, copy.walletFunded(amount, user.wallet_balance));
  if (cart.length > 0) {
    // Funded from the mid-order nudge: carry straight on to paying for what's in the cart.
    await bot.api.sendMessage(user.telegram_id, copy.payPendingFromWallet(cart), {
      reply_markup: new InlineKeyboard().text("👛 Pay from wallet", "checkout:summary"),
    });
  } else {
    await bot.api.sendMessage(user.telegram_id, copy.readyWhenYouAre, {
      reply_markup: new InlineKeyboard().text("🍚 Order food", "menu:home"),
    });
  }
}
