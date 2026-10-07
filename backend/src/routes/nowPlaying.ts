import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { queueRowToNowPlayingDto, toNowPlayingDto } from "../db/dto.js";
import { advanceQueueIfEmpty } from "../services/queueService.js";
import { getClientIp } from "../services/clientIp.js";

const router = Router();

const advanceSchema = z.object({ videoId: z.string().optional() });

router.get("/", (_req, res) => {
  const row = db.prepare("SELECT * FROM now_playing WHERE id = 1").get() as
    | Parameters<typeof toNowPlayingDto>[0]
    | undefined;
  res.json(row ? toNowPlayingDto(row) : null);
});

// Deliberately no POST "/" here: the only way onto now-playing is through the queue
// (see queueService.advanceQueueIfEmpty), so nobody can skip the line via direct API calls.

// Called by the frontend when a track finishes (or errors) to advance the queue server-side.
// Every listener converges on roughly the same position, so several clients can report this
// within moments of each other — if `videoId` is given and no longer matches what's actually
// playing, someone else already advanced past it; treat this as a no-op and just report current
// state, instead of skipping multiple tracks in a row for one real event.
router.post("/advance", (req, res) => {
  const parsed = advanceSchema.safeParse(req.body);
  const expectedVideoId = parsed.success ? parsed.data.videoId : undefined;

  if (expectedVideoId) {
    const current = db.prepare("SELECT * FROM now_playing WHERE id = 1").get() as
      | Parameters<typeof toNowPlayingDto>[0]
      | undefined;
    if (!current || current.video_id !== expectedVideoId) {
      res.json(current ? toNowPlayingDto(current) : null);
      return;
    }
  }

  console.log(
    `[advance] ip=${getClientIp(req)} ua="${req.headers["user-agent"]}" expected=${expectedVideoId ?? "(none)"}`
  );
  const next = advanceQueueIfEmpty();
  res.json(next ? queueRowToNowPlayingDto(next) : null);
});

export default router;
