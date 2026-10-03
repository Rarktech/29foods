import "dotenv/config";
import { Bot, type Context } from "grammy";
import { registerShiftHandlers } from "./handlers/shift";
import { registerStatusHandlers } from "./handlers/status-updates";
import { subscribeToAssignments, registerDeclineHandler } from "./handlers/assignment";
import { startDispatcher } from "./dispatcher";
import { startOutboxSweep } from "./outbox/processor";

const token = process.env.TELEGRAM_RIDER_BOT_TOKEN;
if (!token) throw new Error("Missing required env var: TELEGRAM_RIDER_BOT_TOKEN");

const bot = new Bot<Context>(token);

registerShiftHandlers(bot);
registerStatusHandlers(bot);
registerDeclineHandler(bot);

bot.catch((err) => {
  console.error("Unhandled bot error:", err.error);
});

// Last line of defence for a long-running process: log and keep serving instead of exiting.
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

subscribeToAssignments(bot);
startDispatcher();
startOutboxSweep();

await bot.api.setMyCommands([
  { command: "start", description: "Start your shift" },
  { command: "off", description: "Go off shift (stop getting new orders)" },
]);

bot.start({
  onStart: () => console.log("29Foods rider bot is running (long polling)."),
});
