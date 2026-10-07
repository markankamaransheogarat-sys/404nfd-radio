import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { getClientIp } from "../services/clientIp.js";
import { getAuthedUser, resolveIdentity } from "../services/identity.js";
import { advanceQueueIfEmpty } from "../services/queueService.js";

const router = Router();

const addSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  phraseText: z.string().max(200).nullable().optional(),
  phraseAuthor: z.string().max(64).nullable().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  clientId: z.string().min(1).max(64),
});

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM queue ORDER BY id ASC").all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Queueing requires a logged-in Telegram identity — checked here, not just hidden in the UI,
  // since a hidden button is not a real restriction (anyone can still hit the API directly).
  if (!getAuthedUser(req)) {
    res.status(401).json({ error: "Log in with Telegram to queue a track." });
    return;
  }

  const d = parsed.data;
  const ip = getClientIp(req);
  const identity = resolveIdentity(req, d.clientId);

  // One pending track per listener at a time — otherwise one person can stack the whole
  // queue. Matched by Telegram ID alone (a real account is already a strong identity — no
  // need to also penalize a logged-in listener for a shared WiFi/IP).
  const existing = db.prepare("SELECT id FROM queue WHERE client_id = ?").get(identity);
  if (existing) {
    res.status(409).json({ error: "You already have a track queued — wait for it to play first." });
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO queue (video_id, title, artist, thumbnail_url, phrase_text, phrase_author, duration_seconds, client_id, submitter_ip)
       VALUES (@videoId, @title, @artist, @thumbnailUrl, @phraseText, @phraseAuthor, @durationSeconds, @identity, @ip)`
    )
    .run({
      videoId: d.videoId,
      title: d.title,
      artist: d.artist ?? null,
      thumbnailUrl: d.thumbnailUrl ?? null,
      phraseText: d.phraseText ?? null,
      phraseAuthor: d.phraseAuthor ?? null,
      durationSeconds: d.durationSeconds ?? 0,
      identity,
      ip,
    });

  const row = db.prepare("SELECT * FROM queue WHERE id = ?").get(result.lastInsertRowid);

  // Nothing was playing (static was on) — promote this track to now-playing immediately
  // instead of leaving it stuck in queue until some other track's onEnded fires (there is none).
  const nowPlaying = db.prepare("SELECT id FROM now_playing WHERE id = 1").get();
  if (!nowPlaying) advanceQueueIfEmpty();

  res.status(201).json(row);
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM queue WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
