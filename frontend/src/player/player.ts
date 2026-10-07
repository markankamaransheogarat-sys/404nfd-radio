import { advanceQueue, API_BASE, getNowPlaying, type NowPlaying } from "../api";
import { createYoutubeTransport } from "./youtubeTransport";
import { staticNoise } from "./staticNoise";
import type { PlayerState } from "./types";

const WRAPPER_ID = "yt-player-wrapper"; // owned by React (PlayerBar renders it, empty)
const CONTAINER_ID = "yt-player"; // owned by us — created imperatively inside the wrapper below

// SSE (below) delivers track changes instantly; this poll is just a safety net in case a push
// was missed (e.g. reconnecting), so it can be slow.
const POLL_INTERVAL_MS = 15_000;
// How often to check this listener's own playback position against the server's broadcast
// clock, and how far off it has to drift before we yank it back in line.
const DRIFT_CHECK_MS = 2000;
const DRIFT_THRESHOLD_S = 0.7;

type Mode = "static" | "music";

let transport: ReturnType<typeof createYoutubeTransport> | null = null;
let currentTrack: NowPlaying | null = null;
let mode: Mode = "static";
let wantsToPlay = false; // true once the user has clicked Play at least once
let errorRetryCount = 0; // resets whenever the track actually changes, see adoptTrack

const trackListeners: Array<(t: NowPlaying | null) => void> = [];
const errorListeners: Array<(message: string) => void> = [];
const modeListeners: Array<(m: Mode) => void> = [];
const playingListeners: Array<(playing: boolean) => void> = [];

function notifyPlaying() {
  playingListeners.forEach((cb) => cb(wantsToPlay));
}

function notifyTrack() {
  trackListeners.forEach((cb) => cb(currentTrack));
}

function setMode(next: Mode) {
  if (mode === next) return;
  mode = next;
  modeListeners.forEach((cb) => cb(mode));
}

/** Switches the actually-audible source to match `mode`; only makes sound if the user has hit Play. */
function applyMode() {
  if (mode === "static") {
    transport?.pause();
    if (wantsToPlay) staticNoise.play();
  } else {
    staticNoise.stop();
    if (wantsToPlay) transport?.play();
  }
}

/** Tells the OS/browser this page holds a real media session (lock-screen art + play/pause,
 * notification controls) — on top of being generally nice to have, a page the OS recognizes
 * as an active media session is far less likely to have its audio killed when backgrounded
 * than a silent, unrecognized tab. */
function updateMediaSession(track: NowPlaying | null): void {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = track
    ? new MediaMetadata({
        title: track.title,
        artist: track.artist ?? "404NFD Radio",
        album: "404NFD Radio",
        artwork: track.thumbnailUrl ? [{ src: track.thumbnailUrl, sizes: "320x180", type: "image/jpeg" }] : [],
      })
    : null;
  navigator.mediaSession.playbackState = wantsToPlay ? "playing" : "paused";
}

function adoptTrack(track: NowPlaying | null, seekTo?: number): void {
  currentTrack = track;
  errorRetryCount = 0;
  notifyTrack();
  if (track) {
    setMode("music");
    transport?.loadVideoById(track.videoId, seekTo);
  } else {
    setMode("static");
  }
  applyMode();
  updateMediaSession(track);
}

/** Skips to the next queued track, or falls back to static if the queue is empty. Passes the
 * track this client believes is currently playing — if the server sees something else already
 * playing (another listener's report already advanced it), it's a no-op that just reports
 * current state, instead of skipping multiple tracks for one real event. */
function advanceToNext(): void {
  const expectedVideoId = currentTrack?.videoId;
  void advanceQueue(expectedVideoId).then((next) => {
    const elapsed = next ? Math.max(0, (Date.now() - new Date(next.startedAt).getTime()) / 1000) : undefined;
    adoptTrack(next, elapsed);
  });
}

function syncNowPlaying(): void {
  void getNowPlaying().then((track) => {
    if (track?.videoId === currentTrack?.videoId) return; // no change
    const elapsed = track ? Math.max(0, (Date.now() - new Date(track.startedAt).getTime()) / 1000) : undefined;
    adoptTrack(track, elapsed);
  });
}

/** Pulls this listener's playback position back onto the server's broadcast clock if it's
 * drifted too far over the course of a track. Silent and cheap when already in sync. */
function correctDrift(): void {
  if (mode !== "music" || !wantsToPlay || !currentTrack || !transport) return;
  const expected = Math.max(0, (Date.now() - new Date(currentTrack.startedAt).getTime()) / 1000);
  const actual = transport.getCurrentTime();
  if (Math.abs(expected - actual) > DRIFT_THRESHOLD_S) {
    transport.seek(expected);
  }
}

/** Live push of now-playing changes — this is what makes a track change land on every
 * listener's screen at (near enough) the same instant, instead of staggered up to
 * POLL_INTERVAL_MS apart. EventSource reconnects on its own after a drop; the slow poll
 * above is just a backstop in case a push is ever missed mid-reconnect. */
function connectNowPlayingStream(): void {
  const es = new EventSource(`${API_BASE}/api/now-playing-stream`);
  es.onmessage = (ev) => {
    try {
      const track: NowPlaying | null = JSON.parse(ev.data);
      if (track?.videoId === currentTrack?.videoId) return; // no change
      const elapsed = track ? Math.max(0, (Date.now() - new Date(track.startedAt).getTime()) / 1000) : undefined;
      adoptTrack(track, elapsed);
    } catch {
      // malformed event — ignore, next poll or push will reconcile
    }
  };
}

/** Call once, from a DOM node that lives outside the router's <Outlet> so it never unmounts. */
export function initPlayer(): void {
  if (transport) return; // already initialized (e.g. React StrictMode double-invoke)

  // Create the actual YT mount point ourselves, once, and never again — see the comment on
  // the wrapper div in PlayerBar.tsx for why this can't just be JSX.
  const wrapper = document.getElementById(WRAPPER_ID);
  if (wrapper && !document.getElementById(CONTAINER_ID)) {
    const mount = document.createElement("div");
    mount.id = CONTAINER_ID;
    wrapper.appendChild(mount);
  }

  transport = createYoutubeTransport(CONTAINER_ID);

  transport.onEnded(() => {
    // currentTrack can still be null right after a fresh page load, before the initial
    // now-playing fetch resolves — nothing legitimate to have "ended" yet.
    if (currentTrack) advanceToNext();
  });

  transport.onError((message) => {
    if (!currentTrack) return; // same fresh-load race as onEnded above — nothing to report yet

    // Most errors here are a transient hiccup, not a genuinely broken video — retry the same
    // track a couple times, re-synced to the live position, before concluding it's actually
    // dead and skipping for everyone.
    if (errorRetryCount < 2) {
      errorRetryCount++;
      const elapsed = Math.max(0, (Date.now() - new Date(currentTrack.startedAt).getTime()) / 1000);
      transport?.loadVideoById(currentTrack.videoId, elapsed);
      return;
    }

    errorListeners.forEach((cb) => cb(`${currentTrack?.title ?? "Track"}: ${message} — skipping`));
    advanceToNext();
  });

  void getNowPlaying().then((track) => {
    const elapsed = track ? Math.max(0, (Date.now() - new Date(track.startedAt).getTime()) / 1000) : undefined;
    adoptTrack(track, elapsed);
  });

  connectNowPlayingStream();

  // Backstop in case an SSE push is ever missed (e.g. mid-reconnect).
  setInterval(syncNowPlaying, POLL_INTERVAL_MS);
  setInterval(correctDrift, DRIFT_CHECK_MS);

  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => player.play());
    navigator.mediaSession.setActionHandler("pause", () => player.pause());
  }

  // Mobile browsers commonly suspend YouTube's iframe when the tab/app is backgrounded, even
  // with a media session — there's no page-level API to prevent that, YouTube's player decides
  // on its own. The best we can do is snap straight back to the live position the moment the
  // listener returns, instead of leaving them stuck on "paused" until they notice and tap Play.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wantsToPlay) {
      player.play();
    }
  });
}

export const player = {
  wrapperId: WRAPPER_ID,
  /** Re-syncs to the live position before resuming — otherwise YouTube just resumes from
   * wherever this listener paused, which drifts behind the real broadcast the longer they
   * were away. Also picks up a track change that happened while paused, not just a stale one. */
  play() {
    wantsToPlay = true;
    notifyPlaying();
    void getNowPlaying().then((track) => {
      if (!wantsToPlay) return; // paused again before this resolved
      const elapsed = track ? Math.max(0, (Date.now() - new Date(track.startedAt).getTime()) / 1000) : undefined;
      adoptTrack(track, elapsed);
    });
  },
  pause() {
    wantsToPlay = false;
    notifyPlaying();
    transport?.pause();
    staticNoise.stop();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  },
  setVolume: (v: number) => {
    transport?.setVolume(v);
    staticNoise.setVolume(v);
  },
  onStateChange: (cb: (s: PlayerState) => void) => transport?.onStateChange(cb),
  onTrackChange: (cb: (t: NowPlaying | null) => void) => trackListeners.push(cb),
  onModeChange: (cb: (m: Mode) => void) => modeListeners.push(cb),
  onPlayingChange: (cb: (playing: boolean) => void) => playingListeners.push(cb),
  onError: (cb: (message: string) => void) => errorListeners.push(cb),
  getCurrentTrack: () => currentTrack,
  getMode: () => mode,
  isPlaying: () => wantsToPlay,
  getProgress: (): { current: number; duration: number } => ({
    current: transport?.getCurrentTime() ?? 0,
    duration: transport?.getDuration() ?? 0,
  }),
  /** Re-checks now-playing immediately instead of waiting for the next poll tick — call this
   * right after an action of the current listener's own that's likely to have changed it
   * (e.g. queueing into an empty queue), so the UI (and the skip-vote button) updates at once. */
  refreshNow: syncNowPlaying,
};
