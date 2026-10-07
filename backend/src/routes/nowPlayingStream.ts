import { Router } from "express";
import { db } from "../db/index.js";
import { toNowPlayingDto } from "../db/dto.js";
import { nowPlayingEvents } from "../services/nowPlayingEvents.js";

const router = Router();
const HEARTBEAT_MS = 20_000;

// Server-Sent Events: pushes the new now-playing track to every connected client the instant
// queueService advances, instead of everyone finding out on their own next poll tick (up to
// several seconds later, staggered per client) — this is what makes track changes feel simultaneous.
router.get("/", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (dto: unknown) => {
    res.write(`data: ${JSON.stringify(dto)}\n\n`);
  };

  const row = db.prepare("SELECT * FROM now_playing WHERE id = 1").get() as
    | Parameters<typeof toNowPlayingDto>[0]
    | undefined;
  send(row ? toNowPlayingDto(row) : null);

  const onChange = (dto: unknown) => send(dto);
  nowPlayingEvents.on("change", onChange);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    nowPlayingEvents.off("change", onChange);
  });
});

export default router;
