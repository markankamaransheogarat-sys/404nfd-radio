import { Router } from "express";
import { db } from "../db/index.js";
import { toHistoryEntryDto, toTopUserDto } from "../db/dto.js";
import { getAuthedUser } from "../services/identity.js";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT h.video_id, h.title, h.artist, h.thumbnail_url, h.started_at, u.username, u.first_name
       FROM play_history h
       LEFT JOIN users u ON u.telegram_id = h.telegram_id
       WHERE h.started_at >= datetime('now', '-7 day')
       ORDER BY h.started_at DESC`
    )
    .all() as Parameters<typeof toHistoryEntryDto>[0][];
  res.json(rows.map(toHistoryEntryDto));
});

router.get("/top-users", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT h.telegram_id, COUNT(*) as plays, u.username, u.first_name, u.photo_url
       FROM play_history h
       LEFT JOIN users u ON u.telegram_id = h.telegram_id
       WHERE h.started_at >= datetime('now', '-7 day') AND h.telegram_id IS NOT NULL
       GROUP BY h.telegram_id
       ORDER BY plays DESC
       LIMIT 10`
    )
    .all() as Parameters<typeof toTopUserDto>[0][];
  res.json(rows.map(toTopUserDto));
});

// A listener's own queued tracks from the last 24h, so they can check "did I already put this
// one on" — login-gated since it's tied to a specific Telegram identity, not something an
// anonymous visitor has.
router.get("/mine", (req, res) => {
  const user = getAuthedUser(req);
  if (!user) {
    res.status(401).json({ error: "Log in with Telegram to see your tracks." });
    return;
  }

  const rows = db
    .prepare(
      `SELECT h.video_id, h.title, h.artist, h.thumbnail_url, h.started_at, u.username, u.first_name
       FROM play_history h
       LEFT JOIN users u ON u.telegram_id = h.telegram_id
       WHERE h.started_at >= datetime('now', '-1 day') AND h.telegram_id = ?
       ORDER BY h.started_at DESC`
    )
    .all(user.telegramId) as Parameters<typeof toHistoryEntryDto>[0][];
  res.json(rows.map(toHistoryEntryDto));
});

export default router;
