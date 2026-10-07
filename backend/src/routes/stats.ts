import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { activeTelegramIds, countListeners, heartbeat } from "../services/presence.js";
import { getAuthedUser, resolveIdentity } from "../services/identity.js";

const router = Router();

const MAX_LISTENER_AVATARS = 12;

interface UserRow {
  telegram_id: number;
  username: string | null;
  first_name: string;
  photo_url: string | null;
}

router.get("/", (_req, res) => {
  const { count, totalSeconds } = db
    .prepare("SELECT COUNT(*) as count, COALESCE(SUM(duration_seconds), 0) as totalSeconds FROM queue")
    .get() as { count: number; totalSeconds: number };

  const current = db.prepare("SELECT duration_seconds, started_at FROM now_playing WHERE id = 1").get() as
    | { duration_seconds: number; started_at: string }
    | undefined;

  let remainingOfCurrent = 0;
  if (current && current.duration_seconds > 0) {
    const startedAtMs = new Date(current.started_at.replace(" ", "T") + "Z").getTime();
    const elapsed = (Date.now() - startedAtMs) / 1000;
    remainingOfCurrent = Math.max(0, current.duration_seconds - elapsed);
  }

  const ids = activeTelegramIds().slice(0, MAX_LISTENER_AVATARS);
  const listenersPreview = ids.length
    ? (
        db
          .prepare(`SELECT telegram_id, username, first_name, photo_url FROM users WHERE telegram_id IN (${ids.map(() => "?").join(",")})`)
          .all(...ids) as UserRow[]
      ).map((u) => ({
        telegramId: u.telegram_id,
        displayName: u.username ? `@${u.username}` : u.first_name,
        photoUrl: u.photo_url,
      }))
    : [];

  res.json({
    listeners: countListeners(),
    queueLength: count,
    secondsRemaining: Math.round(totalSeconds + remainingOfCurrent),
    listenersPreview,
  });
});

const heartbeatSchema = z.object({ clientId: z.string().min(1).max(64) });

router.post("/heartbeat", (req, res) => {
  const parsed = heartbeatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const identity = resolveIdentity(req, parsed.data.clientId);
  const user = getAuthedUser(req);
  heartbeat(identity, user?.telegramId ?? null);
  res.status(204).end();
});

export default router;
