import "dotenv/config";
import { Bot, session } from "grammy";
import type { MyContext } from "./bot-context";
import { initialSession } from "./session";
import { supabaseStorage } from "./storage";
import { registerStartHandler } from "./handlers/start";
import { registerUsualHandlers } from "./handlers/usual";
import { registerMenuHandlers } from "./handlers/menu";
import { registerDeliveryHandlers } from "./handlers/delivery";
import { registerCheckoutHandlers } from "./handlers/checkout";
import { registerWalletHandlers } from "./handlers/wallet";
import { registerSpinHandler } from "./handlers/spin";
import { registerFeedbackHandler } from "./handlers/feedback";
import { registerBroadcastHandlers } from "./handlers/broadcast";
import { registerFreeTextHandler } from "./handlers/freetext";
import { subscribeToOrderUpdates } from "./realtime";
import { subscribeToWebOrderPush } from "./push-orders";
import { startSweeper } from "./sweeper";

const token = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
if (!token) throw new Error("Missing required env var: TELEGRAM_CUSTOMER_BOT_TOKEN");

const bot = new Bot<MyContext>(token);

// The ordering flow is a one-to-one conversation; ignore groups/channels entirely.
bot.drop((ctx) => ctx.chat?.type !== "private");
bot.use(session({ initial: initialSession, storage: supabaseStorage }));

// Commands first, then step-specific text handlers (address, phone, feedback reason),
// and the free-text matcher last so it only sees messages nothing else claimed.
registerStartHandler(bot);
registerWalletHandlers(bot);
registerBroadcastHandlers(bot);
registerUsualHandlers(bot);
registerMenuHandlers(bot);
registerCheckoutHandlers(bot);
registerSpinHandler(bot);
registerDeliveryHandlers(bot);
registerFeedbackHandler(bot);
registerFreeTextHandler(bot);

bot.catch((err) => {
  console.error("Unhandled bot error:", err.error);
});

// Last line of defence for a long-running process: log and keep serving instead of exiting.
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

subscribeToOrderUpdates(bot);
subscribeToWebOrderPush();
startSweeper(bot);

// The wallet and menu are always one tap away from the command menu, nothing in progress needed.
await bot.api.setMyCommands([
  { command: "start", description: "Order food" },
  { command: "menu", description: "See today's menu" },
  { command: "wallet", description: "Check or fund your wallet" },
  { command: "stop", description: "Stop the daily menu drops" },
]);
await bot.api.setChatMenuButton({ menu_button: { type: "commands" } });

bot.start({
  onStart: (info) => console.log(`29Foods customer bot @${info.username} is running (long polling).`),
});
