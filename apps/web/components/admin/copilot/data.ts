export interface CopilotStatCard {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative";
}
export interface CopilotExchange {
  question: string;
  answerParts: (string | { bold: string })[];
  stats: CopilotStatCard[];
}

export const COPILOT_EXCHANGES: CopilotExchange[] = [
  {
    question: "Why did complaints spike this week?",
    answerParts: [
      "Complaints rose to ", { bold: "4.2%" }, " of orders this week, up from 3.2% last week. Mostly late-delivery complaints — ",
      { bold: "3 of 5" }, " complaint cases this week trace back to Tochukwu Eze's afternoon runs during Tuesday's rain delay. ",
      { bold: "Ofada Special" }, ' was the most-complained-about dish, mostly flagged "cold on arrival," and was resolved via replacement or store credit.',
    ],
    stats: [
      { label: "Complaint rate this week", value: "4.2% ↑ from 3.2%", tone: "negative" },
      { label: "Top cause", value: "Late delivery (Tue rain)", tone: "neutral" },
    ],
  },
  {
    question: "Which dishes should I discount to clear inventory?",
    answerParts: [
      "Garlic is sitting at ", { bold: "4kg" }, ", well above its 2kg reorder level, but ", { bold: "Garlic Fried Rice" },
      " only moved 31 orders last week — your slowest rice dish. A short promo on it would burn through the surplus before it turns. Meanwhile Rice and pepper are the ones actually running low, so I'd avoid discounting Jollof or Ofada right now — that would only accelerate a stockout.",
    ],
    stats: [
      { label: "Suggested discount target", value: "Garlic Fried Rice", tone: "neutral" },
      { label: "Avoid discounting", value: "Jollof, Ofada — low on rice/pepper", tone: "negative" },
    ],
  },
  {
    question: "Is WELCOME10 actually paying for itself?",
    answerParts: [
      "Yes. WELCOME10 has been redeemed ", { bold: "214 times" }, " for ₦64,800 in total discount, but those redemptions came from mostly first-time customers — ",
      { bold: "38 of 214" }, " have already ordered again without a code. At an average repeat order of ₦3,120, that's roughly ₦118,600 in follow-on revenue the code helped unlock. It's outperforming FRESHERS25, which capped out at 300 uses with far less repeat behavior.",
    ],
    stats: [
      { label: "Repeat orders unlocked", value: "38 customers", tone: "positive" },
      { label: "Follow-on revenue est.", value: "₦118,600", tone: "neutral" },
    ],
  },
];

export const COPILOT_SUGGESTIONS = [
  "Show today's top risks",
  "Compare this week to last week",
  "Which riders need coaching?",
  "What should I restock before the weekend?",
  "Which promo code is underperforming?",
  "Summarize this week for a partner update",
];
