import { Bot } from "grammy";
import { getServiceClient } from "../supabase";
import { getUser } from "../data";
import * as copy from "../copy";
import type { MyContext } from "../bot-context";

/** Stage 11's easy opt-out from the daily menu broadcast — order updates are unaffected. */
export function registerBroadcastHandlers(bot: Bot<MyContext>) {
  bot.command("stop", async (ctx) => {
    const user = await getUser(ctx);
    await getServiceClient().from("users").update({ broadcast_opt_out: true }).eq("id", user.id);
    await ctx.reply(copy.stopped);
  });

  bot.command("resume", async (ctx) => {
    const user = await getUser(ctx);
    await getServiceClient().from("users").update({ broadcast_opt_out: false }).eq("id", user.id);
    await ctx.reply(copy.resumed);
  });
}
