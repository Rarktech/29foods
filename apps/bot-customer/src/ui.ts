import { InlineKeyboard } from "grammy";
import type { MyContext } from "./bot-context";

/**
 * Menu navigation edits the message in place (it's browsing); everything that moves
 * the order forward sends a new message, so the chat reads like a conversation.
 */
export async function respond(ctx: MyContext, text: string, keyboard?: InlineKeyboard, opts: { edit?: boolean } = {}) {
  if (opts.edit && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, { reply_markup: keyboard });
      return;
    } catch {
      // "message is not modified" or too old to edit — fall through to a fresh message.
    }
  }
  await ctx.reply(text, { reply_markup: keyboard });
}

/** Removes the buttons from the message a callback came from, so old choices can't be tapped twice. */
export async function clearButtons(ctx: MyContext) {
  if (!ctx.callbackQuery?.message) return;
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {
    // already cleared
  }
}
