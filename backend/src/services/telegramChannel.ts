import type { NowPlayingDto } from "../db/dto.js";
import { nowPlayingEvents } from "./nowPlayingEvents.js";

// Posts a "now playing" announcement to a Telegram channel whenever the track changes, using
// the same bot already set up for login (BOT_TOKEN) — just needs it added as a channel admin
// with "Post Messages". Silently disabled if TELEGRAM_CHANNEL_ID isn't configured, same pattern
// as BOT_TOKEN being optional for login.

function buildCaption(track: NowPlayingDto): string {
  const lines = [
    `🎶 Сейчас играет: ${track.title}`,
    track.artist,
    track.phraseText ? `💬 «${track.phraseText}»${track.phraseAuthor ? ` — ${track.phraseAuthor}` : ""}` : null,
    "",
    "Слушать: https://404nfd.net",
  ].filter((line): line is string => !!line);
  return lines.join("\n");
}

async function announce(botToken: string, channelId: string, track: NowPlayingDto): Promise<void> {
  const caption = buildCaption(track);
  const useSendPhoto = !!track.thumbnailUrl;
  const endpoint = `https://api.telegram.org/bot${botToken}/${useSendPhoto ? "sendPhoto" : "sendMessage"}`;
  const body = useSendPhoto
    ? { chat_id: channelId, photo: track.thumbnailUrl, caption }
    : { chat_id: channelId, text: caption };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Telegram API ${res.status}: ${await res.text()}`);
  }
}

export function startChannelAnnouncer(): void {
  const botToken = process.env.BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!botToken || !channelId) {
    console.log("Telegram channel announcer disabled (set TELEGRAM_CHANNEL_ID to enable)");
    return;
  }

  nowPlayingEvents.on("change", (track: NowPlayingDto | null) => {
    if (!track) return; // don't announce "nothing playing" — only real tracks
    void announce(botToken, channelId, track).catch((err) => {
      console.error("Telegram channel announce failed:", err);
    });
  });
}
