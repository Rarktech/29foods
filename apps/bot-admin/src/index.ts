import "dotenv/config";
import { Bot, type Context } from "grammy";
import cron from "node-cron";
import { registerNewOrderHandlers } from "./handlers/new-order";
import { registerAssignRiderHandlers } from "./handlers/assign-rider";
import { registerSoldOutHandlers } from "./handlers/sold-out-toggle";
import { registerRiderHandlers } from "./handlers/riders";
import { registerSpinHandlers } from "./handlers/spins";
import { sendDailySummary } from "./handlers/eod-summary";
import { subscribeToNewOrders } from "./realtime/order-listener";
import { watchDispatch } from "./realtime/dispatch-watch";

const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
if (!token) throw new Error("Missing required env var: TELEGRAM_ADMIN_BOT_TOKEN");
const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
if (!adminChatId) throw new Error("Missing required env var: ADMIN_TELEGRAM_CHAT_ID");

const bot = new Bot<Context>(token);

// Staff-only: anyone can find a bot by username, so every update from any other chat is
// refused before it reaches a handler (orders, riders, sold-out toggles, summaries).
bot.use(async (ctx, next) => {
  if (String(ctx.chat?.id) === adminChatId) return next();
  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});
  else if (ctx.chat?.type === "private") await ctx.reply("This bot is for 29Foods staff only.").catch(() => {});
});

registerNewOrderHandlers(bot);
registerAssignRiderHandlers(bot);
registerSoldOutHandlers(bot);
registerRiderHandlers(bot);
registerSpinHandlers(bot);

bot.command("summary", async (ctx) => {
  await ctx.reply("Generating today's summary…");
  await sendDailySummary(bot);
});

bot.catch((err) => {
  console.error("Unhandled bot error:", err.error);
});

// Last line of defence for a long-running process: log and keep serving instead of exiting.
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

subscribeToNewOrders(bot);
watchDispatch(bot);

// 22:00 server time daily. Set TZ=Africa/Lagos on the server (deploy/ecosystem.config.cjs
// does) so this lands at 10pm WAT rather than whatever timezone the machine defaults to.
cron.schedule("0 22 * * *", () => {
  sendDailySummary(bot).catch((err) => console.error("Daily summary failed:", err));
});

await bot.api.setMyCommands(
  [
    { command: "riders", description: "Riders: status, invites, deactivate" },
    { command: "addrider", description: "Add a rider: /addrider Name 080…" },
    { command: "spins", description: "Today's spin prizes and who used them" },
    { command: "soldout", description: "Mark an item sold out" },
    { command: "summary", description: "Today's orders and revenue" },
  ],
  { scope: { type: "chat", chat_id: Number(adminChatId) } },
);

bot.start({
  onStart: () => console.log("29Foods admin bot is running (long polling)."),
});
