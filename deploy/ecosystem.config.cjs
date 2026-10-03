// pm2 process file for the three Telegram bots on a single always-on server
// (see deploy/README.md). Each bot runs as plain `node --import tsx` from its own
// app folder so dotenv picks up that app's .env, without a pnpm wrapper process
// per bot — that matters on a 1 GB e2-micro.
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function bot(name, env = {}) {
  return {
    name: `29foods-${name}`,
    cwd: path.join(root, "apps", `bot-${name}`),
    script: "src/index.ts",
    interpreter: "node",
    node_args: "--import tsx",
    env: { NODE_ENV: "production", ...env },
    max_memory_restart: "300M",
    restart_delay: 5000,
    // Telegram allows exactly one long-polling client per bot token — never run more than one copy.
    instances: 1,
    exec_mode: "fork",
    time: true,
  };
}

module.exports = {
  apps: [
    bot("customer"),
    // The 10pm end-of-day summary is scheduled in local time.
    bot("admin", { TZ: "Africa/Lagos" }),
    bot("rider"),
  ],
};
