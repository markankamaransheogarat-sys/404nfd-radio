// Parses YouTube's ISO-8601 video durations, e.g. "PT3M45S" -> 225, "PT1H2M" -> 3720.
export function parseIsoDuration(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

/** Batch-fetches durations for up to 50 video IDs in a single YouTube Data API call. */
export async function fetchDurations(apiKey: string, videoIds: string[]): Promise<Map<string, number>> {
  const durations = new Map<string, number>();
  if (videoIds.length === 0) return durations;

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) return durations; // best-effort — a failed lookup just means no duration shown

  const data = (await res.json()) as { items: { id: string; contentDetails: { duration: string } }[] };
  for (const item of data.items) {
    durations.set(item.id, parseIsoDuration(item.contentDetails.duration));
  }
  return durations;
}
