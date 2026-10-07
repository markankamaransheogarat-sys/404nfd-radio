// Makes the station a real always-on broadcast: advances the queue based on elapsed wall-clock
// time vs. the track's known duration, independent of whether any listener's browser is even
// open. Without this, "now playing" only ever changed when some client's own YouTube iframe
// fired onEnded — if literally nobody had a tab open with the track loaded, it just sat there
// frozen past its real end time forever.
import { db } from "../db/index.js";
import { advanceQueueIfEmpty } from "./queueService.js";

const CHECK_INTERVAL_MS = 1500;

function checkAndAdvance(): void {
  const current = db.prepare("SELECT duration_seconds, started_at FROM now_playing WHERE id = 1").get() as
    | { duration_seconds: number; started_at: string }
    | undefined;
  if (!current || current.duration_seconds <= 0) return; // unknown duration — can't tell if it "should" be over

  const startedAtMs = new Date(current.started_at.replace(" ", "T") + "Z").getTime();
  const elapsed = (Date.now() - startedAtMs) / 1000;
  if (elapsed >= current.duration_seconds) {
    advanceQueueIfEmpty();
  }
}

export function startRadioClock(): void {
  setInterval(checkAndAdvance, CHECK_INTERVAL_MS);
}
