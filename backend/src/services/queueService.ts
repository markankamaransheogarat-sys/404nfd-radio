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

interface LibraryRow {
  id: number;
  video_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
}

/**
 * Pops the oldest queued track into now_playing. If the queue is empty, falls back to rotating
 * the station library (Google Flow AI generated tracks). Only clears now_playing to static if
 * both queue and library are empty.
 */
export function advanceQueueIfEmpty(): QueueRow | null {
  const next = db.prepare("SELECT * FROM queue ORDER BY id ASC LIMIT 1").get() as QueueRow | undefined;
  if (!next) {
    const libraryTrack = db
      .prepare(
        `SELECT id, video_id, title, artist, thumbnail_url, duration_seconds
         FROM library_tracks
         ORDER BY last_played_at ASC NULLS FIRST, id ASC
         LIMIT 1`
      )
      .get() as LibraryRow | undefined;

    if (libraryTrack) {
      const tx = db.transaction(() => {
        db.prepare(
          `INSERT INTO now_playing (id, video_id, title, artist, thumbnail_url, phrase_text, phrase_author, duration_seconds, started_at, submitter_telegram_id)
           VALUES (1, @video_id, @title, @artist, @thumbnail_url, 'Google Flow AI Rotation', 'Auto-DJ', @duration_seconds, datetime('now'), NULL)
           ON CONFLICT(id) DO UPDATE SET
             video_id = excluded.video_id, title = excluded.title, artist = excluded.artist,
             thumbnail_url = excluded.thumbnail_url, phrase_text = excluded.phrase_text,
             phrase_author = excluded.phrase_author, duration_seconds = excluded.duration_seconds,
             started_at = excluded.started_at, submitter_telegram_id = excluded.submitter_telegram_id`
        ).run(libraryTrack);

        db.prepare(
          `UPDATE library_tracks
           SET play_count = play_count + 1, last_played_at = datetime('now')
           WHERE id = ?`
        ).run(libraryTrack.id);

        db.prepare(
          `INSERT INTO play_history (video_id, title, artist, thumbnail_url, telegram_id)
           VALUES (@video_id, @title, @artist, @thumbnail_url, NULL)`
        ).run(libraryTrack);
      });
      tx();

      const pseudoRow: QueueRow = {
        id: libraryTrack.id,
        video_id: libraryTrack.video_id,
        title: libraryTrack.title,
        artist: libraryTrack.artist,
        thumbnail_url: libraryTrack.thumbnail_url,
        phrase_text: "Google Flow AI Rotation",
        phrase_author: "Auto-DJ",
        duration_seconds: libraryTrack.duration_seconds,
        client_id: null,
      };

      broadcastNowPlaying(queueRowToNowPlayingDto(pseudoRow));
      return pseudoRow;
    }

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
