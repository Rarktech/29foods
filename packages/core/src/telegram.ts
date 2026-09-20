/** Minimal Telegram Bot API sender for contexts without a grammY Bot instance (e.g. the web admin dashboard's broadcast action). */
export async function sendTelegramMessage(botToken: string, chatId: number, text: string): Promise<boolean> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return response.ok;
}

/** Telegram caps outbound messages at ~30/s — sends in small batches with a delay between them. */
export async function sendTelegramBroadcast(
  botToken: string,
  chatIds: number[],
  text: string,
  batchSize = 20,
  delayMs = 1000,
): Promise<number> {
  let sentCount = 0;
  for (let i = 0; i < chatIds.length; i += batchSize) {
    const batch = chatIds.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((chatId) => sendTelegramMessage(botToken, chatId, text)));
    sentCount += results.filter(Boolean).length;
    if (i + batchSize < chatIds.length) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return sentCount;
}
