import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { getAuthedUser, resolveIdentity } from "../services/identity.js";
import { advanceQueueIfEmpty } from "../services/queueService.js";
import { getClientIp } from "../services/clientIp.js";

const router = Router();

// Temporarily off — skip-voting kept mis-firing on tracks that were actually fine (player-side
// bugs, not voting-logic bugs), and turning it off entirely was the fastest way to stop the
// bleeding while that gets sorted. Flip back to true to restore it — nothing else changes.
const SKIP_VOTING_ENABLED = false;

// Flat requirement, not tied to how many people happen to be listening right now — nobody,
// alone or in a small huddle, gets to decide what the room hears.
const SKIP_VOTES_NEEDED = 5;

function currentStatus(identity: string) {
  if (!SKIP_VOTING_ENABLED) return { active: false, votes: 0, needed: 0, voted: false };

  const current = db.prepare("SELECT video_id FROM now_playing WHERE id = 1").get() as
    | { video_id: string }
    | undefined;
  if (!current) return { active: false, votes: 0, needed: 0, voted: false };

  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM skip_votes WHERE video_id = ?")
    .get(current.video_id) as { count: number };
  const voted = !!db
    .prepare("SELECT 1 FROM skip_votes WHERE video_id = ? AND identity = ?")
    .get(current.video_id, identity);

  return { active: true, votes: count, needed: SKIP_VOTES_NEEDED, voted };
}

const bodySchema = z.object({ clientId: z.string().min(1).max(64) });

router.get("/", (req, res) => {
  const parsed = z.object({ clientId: z.string().min(1).max(64) }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  res.json(currentStatus(resolveIdentity(req, parsed.data.clientId)));
});

router.post("/", (req, res) => {
  if (!SKIP_VOTING_ENABLED) {
    res.status(503).json({ error: "Skip voting is temporarily disabled." });
    return;
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Casting a vote requires a logged-in Telegram identity — same reasoning as queueing:
  // checked server-side, not just hidden in the UI, so it can't be bypassed via the raw API.
  if (!getAuthedUser(req)) {
    res.status(401).json({ error: "Log in with Telegram to vote." });
    return;
  }

  const identity = resolveIdentity(req, parsed.data.clientId);

  const current = db.prepare("SELECT video_id FROM now_playing WHERE id = 1").get() as
    | { video_id: string }
    | undefined;
  if (!current) {
    res.status(409).json({ error: "Nothing is playing right now." });
    return;
  }

  db.prepare("INSERT OR IGNORE INTO skip_votes (identity, video_id) VALUES (?, ?)").run(identity, current.video_id);

  const status = currentStatus(identity);
  if (status.votes >= status.needed) {
    console.log(`[vote-skip] threshold reached on ${current.video_id}, skipping (last voter ip=${getClientIp(req)})`);
    db.prepare("DELETE FROM skip_votes WHERE video_id = ?").run(current.video_id);
    advanceQueueIfEmpty();
  }

  res.json(status);
});

export default router;
