import { Router } from "express";
import { z } from "zod";
import { resolveIdentity } from "../services/identity.js";
import { broadcastReaction } from "../services/reactionEvents.js";

const router = Router();

// Fixed set, not free text — this broadcasts to every connected listener instantly, so there's
// no room for a moderation queue. An emoji burst is low-stakes; open text would not be.
const ALLOWED_EMOJI = new Set(["🔥", "❤️", "💀", "😂", "👏", "🎧"]);

const COOLDOWN_MS = 2000;
const PRUNE_AFTER_MS = 60_000; // stale entries just waste memory; nothing reads them once expired
const lastSentAt = new Map<string, number>();

function pruneStale(): void {
  const cutoff = Date.now() - PRUNE_AFTER_MS;
  for (const [id, ts] of lastSentAt) {
    if (ts < cutoff) lastSentAt.delete(id);
  }
}

const bodySchema = z.object({ emoji: z.string(), clientId: z.string().min(1).max(64) });

router.post("/", (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!ALLOWED_EMOJI.has(parsed.data.emoji)) {
    res.status(400).json({ error: "Unsupported reaction" });
    return;
  }

  pruneStale();
  const identity = resolveIdentity(req, parsed.data.clientId);
  const last = lastSentAt.get(identity) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    res.status(429).json({ error: "Slow down" });
    return;
  }
  lastSentAt.set(identity, Date.now());

  broadcastReaction(parsed.data.emoji);
  res.status(204).end();
});

export default router;
