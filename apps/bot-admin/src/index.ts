import "dotenv/config";
import { Bot, type Context } from "grammy";
import cron from "node-cron";
import { registerNewOrderHandlers } from "./handlers/new-order";
import { registerAssignRiderHandlers } from "./handlers/assign-rider";
import { registerSoldOutHandlers } from "./handlers/sold-out-toggle";
import { sendDailySummary } from "./handlers/eod-summary";
import { subscribeToNewOrders } from "./realtime/order-listener";

const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
if (!token) throw new Error("Missing required env var: TELEGRAM_ADMIN_BOT_TOKEN");

const bot = new Bot<Context>(token);

registerNewOrderHandlers(bot);
registerAssignRiderHandlers(bot);
registerSoldOutHandlers(bot);

bot.command("summary", async (ctx) => {
  await ctx.reply("Generating today's summary…");
  await sendDailySummary(bot);
});

bot.catch((err) => {
  console.error("Unhandled bot error:", err.error);
});

subscribeToNewOrders(bot);

// 22:00 server time daily. Set TZ=Africa/Lagos in the Railway service's env vars so this
// lands at 10pm WAT rather than whatever timezone the container defaults to.
cron.schedule("0 22 * * *", () => {
  sendDailySummary(bot).catch((err) => console.error("Daily summary failed:", err));
});

bot.start({
  onStart: () => console.log("29Foods admin bot is running (long polling)."),
});
