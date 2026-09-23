import "dotenv/config";
import { Bot, session } from "grammy";
import type { MyContext } from "./bot-context";
import { initialSession } from "./session";
import { registerStartHandler } from "./handlers/start";
import { registerMenuHandlers } from "./handlers/menu";
import { registerCheckoutHandlers } from "./handlers/checkout";
import { registerFeedbackHandler } from "./handlers/feedback";
import { subscribeToOrderUpdates } from "./realtime";
import { subscribeToWebOrderPush } from "./push-orders";

const token = process.env.TELEGRAM_CUSTOMER_BOT_TOKEN;
if (!token) throw new Error("Missing required env var: TELEGRAM_CUSTOMER_BOT_TOKEN");

const bot = new Bot<MyContext>(token);

bot.use(session({ initial: initialSession }));

registerStartHandler(bot);
registerMenuHandlers(bot);
registerCheckoutHandlers(bot);
registerFeedbackHandler(bot);

bot.catch((err) => {
  console.error("Unhandled bot error:", err.error);
});

subscribeToOrderUpdates(bot);
subscribeToWebOrderPush();

bot.start({
  onStart: () => console.log("29Foods customer bot is running (long polling)."),
});
