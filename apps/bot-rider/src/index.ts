import "dotenv/config";
import { Bot, type Context } from "grammy";
import { registerShiftHandlers } from "./handlers/shift";
import { registerStatusHandlers } from "./handlers/status-updates";
import { subscribeToAssignments } from "./handlers/assignment";
import { startOutboxSweep } from "./outbox/processor";

const token = process.env.TELEGRAM_RIDER_BOT_TOKEN;
if (!token) throw new Error("Missing required env var: TELEGRAM_RIDER_BOT_TOKEN");

const bot = new Bot<Context>(token);

registerShiftHandlers(bot);
registerStatusHandlers(bot);

bot.catch((err) => {
  console.error("Unhandled bot error:", err.error);
});

subscribeToAssignments(bot);
startOutboxSweep();

bot.start({
  onStart: () => console.log("29Foods rider bot is running (long polling)."),
});
