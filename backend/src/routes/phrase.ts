import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { getAuthedUser } from "../services/identity.js";

const router = Router();

const phraseSchema = z.object({
  videoId: z.string().min(1),
  text: z.string().min(1).max(200),
  author: z.string().max(64).nullable().optional(),
});

// Attaches a phrase to whichever entry (now playing, or the most recent matching
// queue entry) currently holds that videoId.
router.post("/", (req, res) => {
  if (!getAuthedUser(req)) {
    res.status(401).json({ error: "Log in with Telegram to leave a note." });
    return;
  }

  const parsed = phraseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { videoId, text, author } = parsed.data;

  const nowPlaying = db.prepare("SELECT id FROM now_playing WHERE id = 1 AND video_id = ?").get(videoId);
  if (nowPlaying) {
    db.prepare("UPDATE now_playing SET phrase_text = ?, phrase_author = ? WHERE id = 1").run(
      text,
      author ?? null
    );
    res.json({ attachedTo: "now_playing" });
    return;
  }

  const queued = db
    .prepare("SELECT id FROM queue WHERE video_id = ? ORDER BY id DESC LIMIT 1")
    .get(videoId) as { id: number } | undefined;
  if (queued) {
    db.prepare("UPDATE queue SET phrase_text = ?, phrase_author = ? WHERE id = ?").run(
      text,
      author ?? null,
      queued.id
    );
    res.json({ attachedTo: "queue", queueId: queued.id });
    return;
  }

  res.status(404).json({ error: "No now-playing or queued entry with that videoId" });
});

export default router;
