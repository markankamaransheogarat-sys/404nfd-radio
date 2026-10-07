import { Router } from "express";
import { reactionEvents, type ReactionEvent } from "../services/reactionEvents.js";

const router = Router();
const HEARTBEAT_MS = 20_000;

// Server-Sent Events fanout for live emoji reactions — same shape as nowPlayingStream, but with
// no initial state to send (a reaction that already happened isn't meaningful to a new joiner).
router.get("/", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const onReaction = (event: ReactionEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  reactionEvents.on("reaction", onReaction);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    reactionEvents.off("reaction", onReaction);
  });
});

export default router;
