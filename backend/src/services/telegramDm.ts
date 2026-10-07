// Pings a listener in Telegram the instant their queued track goes live. Uses the same bot as
// login/channel-posting (BOT_TOKEN) — no extra setup needed if that's already configured.
//
// This can fail for a real, unavoidable reason: Telegram only lets a bot DM a user who has
// already opened a chat with it at least once (e.g. pressed Start). Logging in via the Telegram
// Login Widget does NOT guarantee that. So a failure here is expected for some fraction of
// users, not a bug — it's logged and swallowed, never allowed to break the actual track advance.

async function sendDm(botToken: string, telegramId: number, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: telegramId, text }),
  });
  if (!res.ok) {
    throw new Error(`Telegram API ${res.status}: ${await res.text()}`);
  }
}

export function notifyTrackLive(telegramId: number, trackTitle: string): void {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return; // same optional-feature pattern as the channel announcer

  const text = `🎙 Твой трек сейчас в эфире: «${trackTitle}»\n\nСлушать: https://404nfd.net`;
  void sendDm(botToken, telegramId, text).catch((err) => {
    // Most common cause: this listener never opened a chat with the bot, so Telegram refuses
    // the DM — not worth logging as an error, just a debug breadcrumb.
    console.log(`Track-live DM to ${telegramId} skipped:`, err instanceof Error ? err.message : err);
  });
}
