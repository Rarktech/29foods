import { Bot, InlineKeyboard } from "grammy";
import { linkPhoneToUser, updateProfile } from "@29foods/core";
import { getServiceClient } from "../supabase";
import { getUser, type UserRow } from "../data";
import { clearButtons } from "../ui";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";
import type { Address } from "../session";
import { showSummary } from "./checkout";

const LODGE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s.,'&()\/-]{1,59}$/u;
const ROOM_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s.,'#&()\/-]{0,39}$/u;

export function registerDeliveryHandlers(bot: Bot<MyContext>) {
  bot.callbackQuery("addr:saved", async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    ctx.session.oneOff = null;
    await afterAddress(ctx);
  });

  bot.callbackQuery("addr:oneoff", async (ctx) => {
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);
    ctx.session.step = "oneoff_lodge";
    ctx.session.reasked = false;
    await ctx.reply(copy.askOneOffLodge);
  });

  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session.step;
    if (step !== "lodge" && step !== "room" && step !== "oneoff_lodge" && step !== "oneoff_room" && step !== "phone") return next();
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return next();

    if (step === "lodge" || step === "oneoff_lodge") {
      if (!LODGE_PATTERN.test(text) && !ctx.session.reasked) {
        ctx.session.reasked = true;
        await ctx.reply(copy.reaskLodge);
        return;
      }
      ctx.session.draftLodge = text.slice(0, 60);
      ctx.session.reasked = false;
      ctx.session.step = step === "lodge" ? "room" : "oneoff_room";
      await ctx.reply(step === "lodge" ? copy.askRoomAt(ctx.session.draftLodge, false) : copy.askOneOffRoom(ctx.session.draftLodge));
      return;
    }

    if (step === "room" || step === "oneoff_room") {
      const lodge = ctx.session.draftLodge;
      if (!lodge) {
        ctx.session.step = null;
        return startDelivery(ctx);
      }
      if (!ROOM_PATTERN.test(text) && !ctx.session.reasked) {
        ctx.session.reasked = true;
        await ctx.reply(copy.reaskRoom(lodge));
        return;
      }
      const room = text.toLowerCase() === "skip" ? null : text.replace(/^room\s*/i, "").slice(0, 40);
      ctx.session.step = null;
      ctx.session.reasked = false;
      ctx.session.draftLodge = null;

      if (step === "oneoff_room") {
        ctx.session.oneOff = { lodge, room };
      } else {
        // First time this user has given an address — it becomes their saved default.
        const user = await getUser(ctx);
        await updateProfile(getServiceClient(), user.id, { lodge, room });
      }
      await afterAddress(ctx);
      return;
    }

    if (step === "phone") {
      ctx.session.step = null;
      if (text.toLowerCase() !== "skip") {
        const user = await getUser(ctx);
        try {
          await linkPhoneToUser(getServiceClient(), user.id, text.replace(/[\s-]/g, ""));
        } catch {
          await ctx.reply(copy.badPhone);
        }
      }
      await showSummary(ctx);
    }
  });
}

/**
 * Never ask for what we already have: a saved address is offered for one-tap confirm
 * (with a one-off override), a QR lodge only needs a room, and only a cold first-timer
 * is asked for both.
 */
export async function startDelivery(ctx: MyContext) {
  const user = await getUser(ctx);
  ctx.session.oneOff = null;
  ctx.session.reasked = false;

  if (user.lodge) {
    await ctx.reply(copy.confirmSavedAddress(user.lodge, user.room), {
      reply_markup: new InlineKeyboard()
        .text("✅ Yes, that's right", "addr:saved")
        .row()
        .text("📍 Deliver somewhere else", "addr:oneoff")
        .row()
        .text("➕ Add something else first", "menu:home"),
    });
    return;
  }

  if (ctx.session.qrLodge) {
    ctx.session.draftLodge = ctx.session.qrLodge;
    ctx.session.step = "room";
    await ctx.reply(copy.askRoomAt(ctx.session.qrLodge, true));
    return;
  }

  ctx.session.step = "lodge";
  await ctx.reply(copy.askLodge);
}

async function afterAddress(ctx: MyContext) {
  const user = await getUser(ctx);
  if (!user.phone) {
    ctx.session.step = "phone";
    await ctx.reply(copy.askPhone);
    return;
  }
  await showSummary(ctx);
}

/** This order's drop-off: the one-off override if set, else the saved default. */
export function deliveryAddress(ctx: MyContext, user: UserRow): Address | null {
  if (ctx.session.oneOff) return ctx.session.oneOff;
  return user.lodge ? { lodge: user.lodge, room: user.room } : null;
}
