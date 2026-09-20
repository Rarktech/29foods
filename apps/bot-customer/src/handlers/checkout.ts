import { randomUUID } from "node:crypto";
import { Bot, InlineKeyboard } from "grammy";
import {
  formatKobo,
  calculateDeliveryFee,
  createOrderWithReservation,
  OutOfStockError,
  linkPhoneToUser,
  initiateFlutterwavePayment,
  resolveOrCreateUserByTelegram,
  updateProfile,
  type CartItem,
} from "@29foods/core";
import { getServiceClient } from "../supabase";
import { cartSubtotal } from "../session";
import type { MyContext } from "../bot-context";

export function registerCheckoutHandlers(bot: Bot<MyContext>) {
  bot.callbackQuery("cart:view", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.session.cart.length === 0) {
      await ctx.editMessageText("Your cart is empty.", { reply_markup: new InlineKeyboard().text("🍚 See menu", "menu:home") });
      return;
    }

    const subtotal = cartSubtotal(ctx.session.cart);
    const lines = ctx.session.cart.map((l) => `${l.qty}x ${l.name} — ${formatKobo(l.unitPrice * l.qty)}`).join("\n");
    const keyboard = new InlineKeyboard().text("✅ Checkout", "checkout:start").row().text("⬅️ Add more", "menu:home");

    await ctx.editMessageText(`🛒 Your cart:\n\n${lines}\n\nSubtotal: ${formatKobo(subtotal)}`, { reply_markup: keyboard });
  });

  bot.callbackQuery("checkout:start", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.session.lodge) {
      const keyboard = new InlineKeyboard()
        .text(`📍 Use ${ctx.session.lodge}${ctx.session.room ? `, ${ctx.session.room}` : ""}`, "checkout:use_saved")
        .row()
        .text("Enter a different location", "checkout:new_location");
      await ctx.editMessageText("Where's it going?", { reply_markup: keyboard });
      return;
    }
    ctx.session.awaitingInput = "lodge";
    await ctx.editMessageText("What's your lodge?");
  });

  bot.callbackQuery("checkout:new_location", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.awaitingInput = "lodge";
    await ctx.editMessageText("What's your lodge?");
  });

  bot.callbackQuery("checkout:use_saved", async (ctx) => {
    await ctx.answerCallbackQuery();
    await promptForPhoneOrSummary(ctx);
  });

  bot.on("message:text", async (ctx, next) => {
    const awaiting = ctx.session.awaitingInput;
    if (!awaiting) return next();
    const text = ctx.message.text.trim();

    if (awaiting === "lodge") {
      ctx.session.lodge = text;
      ctx.session.awaitingInput = "room";
      await ctx.reply("Room number? (or type \"skip\")");
      return;
    }

    if (awaiting === "room") {
      ctx.session.room = text.toLowerCase() === "skip" ? null : text;
      ctx.session.awaitingInput = null;
      await promptForPhoneOrSummary(ctx);
      return;
    }

    if (awaiting === "phone") {
      ctx.session.awaitingInput = null;
      if (text.toLowerCase() !== "skip") {
        const supabase = getServiceClient();
        const user = await resolveOrCreateUserByTelegram(supabase, { telegramId: ctx.from!.id, name: ctx.from!.first_name ?? null });
        try {
          await linkPhoneToUser(supabase, user.id, text);
        } catch {
          await ctx.reply("That phone number looks invalid — skipping it for now.");
        }
      }
      await showOrderSummary(ctx);
      return;
    }
  });

  bot.callbackQuery("pay:confirm", async (ctx) => {
    await ctx.answerCallbackQuery();
    await placeOrder(ctx);
  });
}

async function promptForPhoneOrSummary(ctx: MyContext) {
  const supabase = getServiceClient();
  const user = await resolveOrCreateUserByTelegram(supabase, { telegramId: ctx.from!.id, name: ctx.from!.first_name ?? null });
  if (user.phone) {
    await showOrderSummary(ctx);
    return;
  }
  ctx.session.awaitingInput = "phone";
  await ctx.reply("Phone number, so the rider can call you? (optional — type \"skip\")");
}

async function showOrderSummary(ctx: MyContext) {
  const subtotal = cartSubtotal(ctx.session.cart);
  const deliveryFee = calculateDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;

  const keyboard = new InlineKeyboard().text(`💳 Pay ${formatKobo(total)}`, "pay:confirm");
  await ctx.reply(
    `${ctx.session.lodge}${ctx.session.room ? `, ${ctx.session.room}` : ""}\n\n` +
      `Subtotal: ${formatKobo(subtotal)}\nDelivery: ${deliveryFee === 0 ? "Free" : formatKobo(deliveryFee)}\nTotal: ${formatKobo(total)}`,
    { reply_markup: keyboard },
  );
}

async function placeOrder(ctx: MyContext) {
  if (ctx.session.cart.length === 0 || !ctx.session.lodge) {
    await ctx.reply("Something went wrong — let's start over with /start.");
    return;
  }

  const supabase = getServiceClient();
  const user = await resolveOrCreateUserByTelegram(supabase, { telegramId: ctx.from!.id, name: ctx.from!.first_name ?? null });

  // Persist the confirmed location as the new saved default (the "reuse or update saved location" behavior).
  await updateProfile(supabase, user.id, { lodge: ctx.session.lodge, room: ctx.session.room });

  const cartItems: CartItem[] = ctx.session.cart.map((l) => ({ menu_item_id: l.menuItemId, name: l.name, qty: l.qty, unit_price: l.unitPrice }));
  const subtotal = cartSubtotal(ctx.session.cart);
  const deliveryFee = calculateDeliveryFee(subtotal);
  const txRef = `29foods_${randomUUID()}`;

  let order;
  try {
    order = await createOrderWithReservation(supabase, {
      userId: user.id,
      items: cartItems,
      lodge: ctx.session.lodge,
      room: ctx.session.room,
      deliveryFee,
      channel: "telegram",
      sourceQr: ctx.session.sourceQr,
      txRef,
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      await ctx.reply("One of your items just sold out — please check your cart and try again.");
      return;
    }
    throw err;
  }

  const { paymentLink } = await initiateFlutterwavePayment({
    txRef,
    amountNaira: order.total / 100,
    customerEmail: user.email ?? `telegram-${user.telegram_id}@29foods.app`,
    customerName: user.name,
    customerPhone: user.phone,
    redirectUrl: `${process.env.NEXT_PUBLIC_WEB_BASE_URL ?? "https://29foods.vercel.app"}/order/${order.id}`,
  });

  ctx.session.cart = [];
  ctx.session.upsellShown = false;

  const keyboard = new InlineKeyboard().url("💳 Pay now", paymentLink);
  await ctx.reply(`Almost there! Tap below to pay ${formatKobo(order.total)} securely via Flutterwave.`, { reply_markup: keyboard });
}
