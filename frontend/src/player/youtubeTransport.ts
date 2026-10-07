import type { PlayerState, PlayerTransport } from "./types";

// Minimal shape of the bits of the YT IFrame API we actually use.
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  cueVideoById(videoId: string): void;
  setVolume(v: number): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackQuality(quality: string): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        opts: {
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: { data: number }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_STATE_ENDED = 0;
const YT_STATE_PLAYING = 1;

function describeError(code: number): string {
  switch (code) {
    case 2:
      return "Invalid video";
    case 5:
      return "Playback error";
    case 100:
      return "Video not found or removed";
    case 101:
    case 150:
      return "Embedding disabled by the video owner";
    default:
      return "Playback error";
  }
}

function loadYouTubeApiScript(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
}

export function createYoutubeTransport(containerElementId: string): PlayerTransport {
  let ytPlayer: YTPlayer | null = null;
  let ready = false;
  const stateListeners: Array<(s: PlayerState) => void> = [];
  const endedListeners: Array<() => void> = [];
  const errorListeners: Array<(message: string) => void> = [];
  let pendingVideoId: { id: string; startSeconds?: number; cueOnly?: boolean } | null = null;
  let volume = 1;
  let pendingPlay = false; // play() called before the player was actually ready — flush it on ready

  function buildState(isPlaying: boolean): PlayerState {
    return {
      isPlaying,
      isReady: ready,
      currentTime: ytPlayer?.getCurrentTime() ?? 0,
      duration: ytPlayer?.getDuration() ?? 0,
      volume,
    };
  }

  void loadYouTubeApiScript().then(() => {
    ytPlayer = new window.YT!.Player(containerElementId, {
      playerVars: { autoplay: 0, controls: 1, rel: 0, enablejsapi: 1, origin: window.location.origin },
      events: {
        onReady: () => {
          ready = true;
          ytPlayer!.setVolume(volume * 100); // apply whatever setVolume() calls landed before ready
          if (pendingVideoId) {
            if (pendingVideoId.cueOnly) {
              ytPlayer!.cueVideoById(pendingVideoId.id);
            } else {
              ytPlayer!.loadVideoById(pendingVideoId.id, pendingVideoId.startSeconds);
            }
            ytPlayer!.setPlaybackQuality("tiny"); // only the audio is ever heard here — no point fetching HD video
            pendingVideoId = null;
          }
          if (pendingPlay) {
            ytPlayer!.playVideo();
            pendingPlay = false;
          }
          stateListeners.forEach((cb) => cb(buildState(false)));
        },
        onStateChange: (e) => {
          if (e.data === YT_STATE_ENDED) {
            endedListeners.forEach((cb) => cb());
          }
          if (e.data === YT_STATE_PLAYING) {
            // YouTube sometimes ignores the quality hint set before buffering starts; reassert it now.
            ytPlayer?.setPlaybackQuality("tiny");
          }
          stateListeners.forEach((cb) => cb(buildState(e.data === YT_STATE_PLAYING)));
        },
        onError: (e) => {
          errorListeners.forEach((cb) => cb(describeError(e.data)));
        },
      },
    });
  });

  return {
    loadVideoById(videoId, startSeconds) {
      if (!ready || !ytPlayer) {
        pendingVideoId = { id: videoId, startSeconds };
        return;
      }
      ytPlayer.loadVideoById(videoId, startSeconds);
      ytPlayer.setPlaybackQuality("tiny");
    },
    cueVideoById(videoId) {
      if (!ready || !ytPlayer) {
        pendingVideoId = { id: videoId, cueOnly: true };
        return;
      }
      ytPlayer.cueVideoById(videoId);
      ytPlayer.setPlaybackQuality("tiny");
    },
    play() {
      // The Player object exists the instant `new YT.Player()` returns, but its actual API
      // methods (pauseVideo, playVideo, ...) aren't safe to call until onReady fires — calling
      // them earlier throws "not a function", not just a harmless no-op. Everything below
      // guards on `ready` for the same reason.
      if (!ready || !ytPlayer) {
        pendingPlay = true;
        return;
      }
      ytPlayer.playVideo();
    },
    pause() {
      pendingPlay = false;
      if (!ready || !ytPlayer) return;
      ytPlayer.pauseVideo();
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (!ready || !ytPlayer) return;
      ytPlayer.setVolume(volume * 100);
    },
    seek(seconds) {
      if (!ready || !ytPlayer) return;
      ytPlayer.seekTo(seconds, true);
    },
    getCurrentTime() {
      return ready && ytPlayer ? ytPlayer.getCurrentTime() : 0;
    },
    getDuration() {
      return ready && ytPlayer ? ytPlayer.getDuration() : 0;
    },
    onStateChange(cb) {
      stateListeners.push(cb);
    },
    onEnded(cb) {
      endedListeners.push(cb);
    },
    onError(cb) {
      errorListeners.push(cb);
    },
  };
}
