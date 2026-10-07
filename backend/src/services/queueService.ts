import { db } from "../db/index.js";
import { queueRowToNowPlayingDto } from "../db/dto.js";
import { broadcastNowPlaying } from "./nowPlayingEvents.js";
import { notifyTrackLive } from "./telegramDm.js";

interface QueueRow {
  id: number;
  video_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  phrase_text: string | null;
  phrase_author: string | null;
  duration_seconds: number;
  client_id: string | null;
}

/** Queueing is login-gated, so client_id is always "tg:<id>" in practice — pull the numeric id
 * back out so play_history can join straight to `users` without re-parsing this string later. */
function telegramIdFromIdentity(identity: string | null): number | null {
  if (!identity?.startsWith("tg:")) return null;
  const id = Number(identity.slice(3));
  return Number.isFinite(id) ? id : null;
}

/**
 * Pops the oldest queued track into now_playing. Returns it, or null if the queue is empty —
 * in which case now_playing is cleared too, so GET /api/now-playing reports "nothing playing"
 * and every client falls back to static instead of looping a stale track's stale metadata.
 */
export function advanceQueueIfEmpty(): QueueRow | null {
  const next = db.prepare("SELECT * FROM queue ORDER BY id ASC LIMIT 1").get() as QueueRow | undefined;
  if (!next) {
    db.prepare("DELETE FROM now_playing WHERE id = 1").run();
    broadcastNowPlaying(null);
    return null;
  }

  const submitterTelegramId = telegramIdFromIdentity(next.client_id);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO now_playing (id, video_id, title, artist, thumbnail_url, phrase_text, phrase_author, duration_seconds, started_at, submitter_telegram_id)
       VALUES (1, @video_id, @title, @artist, @thumbnail_url, @phrase_text, @phrase_author, @duration_seconds, datetime('now'), @submitter_telegram_id)
       ON CONFLICT(id) DO UPDATE SET
         video_id = excluded.video_id, title = excluded.title, artist = excluded.artist,
         thumbnail_url = excluded.thumbnail_url, phrase_text = excluded.phrase_text,
         phrase_author = excluded.phrase_author, duration_seconds = excluded.duration_seconds,
         started_at = excluded.started_at, submitter_telegram_id = excluded.submitter_telegram_id`
    ).run({ ...next, submitter_telegram_id: submitterTelegramId });
    db.prepare("DELETE FROM queue WHERE id = ?").run(next.id);
    db.prepare(
      `INSERT INTO play_history (video_id, title, artist, thumbnail_url, telegram_id)
       VALUES (@video_id, @title, @artist, @thumbnail_url, @telegram_id)`
    ).run({ ...next, telegram_id: submitterTelegramId });
  });
  tx();

  broadcastNowPlaying(queueRowToNowPlayingDto(next));
  if (submitterTelegramId) notifyTrackLive(submitterTelegramId, next.title);
  return next;
}
