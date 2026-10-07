import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./db/index.js"; // ensure schema is created before routes touch it
import searchRouter from "./routes/search.js";
import nowPlayingRouter from "./routes/nowPlaying.js";
import nowPlayingStreamRouter from "./routes/nowPlayingStream.js";
import queueRouter from "./routes/queue.js";
import phraseRouter from "./routes/phrase.js";
import contactRouter from "./routes/contact.js";
import scheduleRouter from "./routes/schedule.js";
import showsRouter from "./routes/shows.js";
import statsRouter from "./routes/stats.js";
import authRouter from "./routes/auth.js";
import voteSkipRouter from "./routes/voteSkip.js";
import historyRouter from "./routes/history.js";
import reactionsRouter from "./routes/reactions.js";
import reactionsStreamRouter from "./routes/reactionsStream.js";
import { startRadioClock } from "./services/radioClock.js";
import { startChannelAnnouncer } from "./services/telegramChannel.js";
import { startTelegramBot } from "./services/telegramBot.js";
import { renderIndexHtml } from "./services/ogHtml.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Correct path to /root/404nfd-radio/backend/media regardless of running from src or dist
const mediaDir = path.resolve(__dirname, "..", "media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve local audio tracks from Google Flow Music with HTTP Range support
app.use(
  ["/audio", "/media"],
  express.static(mediaDir, {
    acceptRanges: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Accept-Ranges", "bytes");
    },
  })
);

app.use("/api/search", searchRouter);
app.use("/api/now-playing", nowPlayingRouter);
app.use("/api/now-playing-stream", nowPlayingStreamRouter);
app.use("/api/queue", queueRouter);
app.use("/api/phrase", phraseRouter);
app.use("/api/contact", contactRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/shows", showsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/auth", authRouter);
app.use("/api/vote-skip", voteSkipRouter);
app.use("/api/history", historyRouter);
app.use("/api/reactions", reactionsRouter);
app.use("/api/reactions-stream", reactionsStreamRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Serve the built frontend SPA (present in production; absent during `npm run dev`).
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
const indexHtmlPath = path.join(frontendDist, "index.html");
// `index: false` — index.html needs to go through renderIndexHtml below for the dynamic OG
// tags, so static() must not auto-serve it for "/" before the catch-all gets a chance.
app.use(express.static(frontendDist, { index: false }));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/media/")) {
    next();
    return;
  }
  try {
    res.type("html").send(renderIndexHtml(indexHtmlPath));
  } catch {
    next();
  }
});

startRadioClock();
startChannelAnnouncer();
startTelegramBot();

const port = Number(process.env.PORT ?? 8004);
app.listen(port, "0.0.0.0", () => {
  console.log(`404nfd-radio backend listening on :${port}`);
});
