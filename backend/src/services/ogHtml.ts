import fs from "node:fs";
import { db } from "../db/index.js";

// Swaps the built index.html's default OG/Twitter meta values for the currently-playing track,
// so a link someone pastes into Telegram/Twitter/Discord shows "Now playing: X" with the real
// cover art instead of a generic site card — free reach on every share, not just the first one.
const DEFAULT_TITLE = "404NFD Radio — community-run web radio";
const DEFAULT_DESCRIPTION =
  "Queue a track, vote to skip, listen live — no host, no algorithm, just whoever's online right now.";
const DEFAULT_IMAGE = "https://404nfd.net/logo.png";

export function renderIndexHtml(indexHtmlPath: string): string {
  // Re-read on every request rather than caching in memory — it's a couple KB, traffic here is
  // low, and a cached copy would otherwise go stale on every frontend-only deploy (no dist
  // change reaches a running process) until the backend happens to restart too.
  const template = fs.readFileSync(indexHtmlPath, "utf-8");

  const track = db.prepare("SELECT title, artist, thumbnail_url FROM now_playing WHERE id = 1").get() as
    | { title: string; artist: string | null; thumbnail_url: string | null }
    | undefined;

  if (!track) return template;

  const title = `🎙 Now playing: ${track.title}${track.artist ? ` — ${track.artist}` : ""} · 404NFD Radio`;
  const description = "Live now on 404NFD Radio — the community-run web radio. Tune in and queue the next one.";
  const image = track.thumbnail_url ?? DEFAULT_IMAGE;

  return template
    .replaceAll(DEFAULT_TITLE, escapeHtml(title))
    .replaceAll(DEFAULT_DESCRIPTION, escapeHtml(description))
    .replaceAll(DEFAULT_IMAGE, image);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
