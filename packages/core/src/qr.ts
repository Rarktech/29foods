/** Web: `29foods.vercel.app/?src=peace-lodge`. Returns null if absent. */
export function parseWebQrParam(searchParams: URLSearchParams): string | null {
  return searchParams.get("src");
}

/** Bot: `t.me/29FoodsBot?start=peace-lodge` delivers the payload as the /start command's argument. */
export function parseBotStartPayload(startPayload: string | undefined): string | null {
  const trimmed = startPayload?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
