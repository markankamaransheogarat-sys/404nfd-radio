import { createYoutubeTransport } from "./youtubeTransport";
import type { PlayerState, PlayerTransport } from "./types";

function isDirectAudio(id: string): boolean {
  return (
    id.startsWith("/media/") ||
    id.startsWith("http://") ||
    id.startsWith("https://") ||
    /\.(mp3|wav|ogg|m4a|aac|flac)($|\?)/i.test(id)
  );
}

export function createHybridTransport(containerId: string): PlayerTransport {
  const yt = createYoutubeTransport(containerId);
  const audio = new Audio();
  audio.preload = "auto";

  let activeSource: "none" | "youtube" | "audio" = "none";
  let wantsToPlay = false;
  let currentVolume = 1;

  const endedCbs: Array<() => void> = [];
  const errorCbs: Array<(message: string) => void> = [];
  const stateCbs: Array<(state: PlayerState) => void> = [];

  function emitState() {
    const isPlaying =
      activeSource === "audio"
        ? !audio.paused && !audio.ended && audio.readyState > 2
        : wantsToPlay;
    const isReady =
      activeSource === "audio" ? audio.readyState >= 1 : true;
    const currentTime =
      activeSource === "audio" ? audio.currentTime : yt.getCurrentTime();
    const duration =
      activeSource === "audio" ? audio.duration || 0 : yt.getDuration();

    const state: PlayerState = {
      isPlaying,
      isReady,
      currentTime,
      duration,
      volume: currentVolume,
    };
    stateCbs.forEach((cb) => cb(state));
  }

  audio.addEventListener("play", emitState);
  audio.addEventListener("pause", emitState);
  audio.addEventListener("timeupdate", emitState);
  audio.addEventListener("loadedmetadata", emitState);
  audio.addEventListener("ended", () => {
    if (activeSource === "audio") {
      endedCbs.forEach((cb) => cb());
    }
  });
  audio.addEventListener("error", () => {
    if (activeSource === "audio") {
      errorCbs.forEach((cb) => cb("Ошибка воспроизведения аудиофайла"));
    }
  });

  yt.onEnded(() => {
    if (activeSource === "youtube") {
      endedCbs.forEach((cb) => cb());
    }
  });

  yt.onError((msg) => {
    if (activeSource === "youtube") {
      errorCbs.forEach((cb) => cb(msg));
    }
  });

  yt.onStateChange((s) => {
    if (activeSource === "youtube") {
      stateCbs.forEach((cb) => cb(s));
    }
  });

  return {
    loadVideoById(id: string, startSeconds?: number) {
      if (isDirectAudio(id)) {
        if (activeSource === "youtube") {
          yt.pause();
        }
        activeSource = "audio";
        const url = id.startsWith("/") || id.startsWith("http") ? id : `/${id}`;
        if (audio.src !== url && !audio.src.endsWith(url)) {
          audio.src = url;
          audio.load();
        }
        if (startSeconds !== undefined && startSeconds > 0) {
          audio.currentTime = startSeconds;
        }
        if (wantsToPlay) {
          audio.play().catch((err) => {
            console.warn("Autoplay audio blocked or waiting for user interaction:", err);
          });
        }
      } else {
        if (activeSource === "audio") {
          audio.pause();
          audio.src = "";
        }
        activeSource = "youtube";
        yt.loadVideoById(id, startSeconds);
      }
      emitState();
    },

    cueVideoById(id: string) {
      if (isDirectAudio(id)) {
        const url = id.startsWith("/") || id.startsWith("http") ? id : `/${id}`;
        audio.src = url;
        audio.preload = "auto";
      } else {
        yt.cueVideoById(id);
      }
    },

    play() {
      wantsToPlay = true;
      if (activeSource === "audio") {
        audio.play().catch((err) => {
          console.warn("Audio play prevented:", err);
        });
      } else if (activeSource === "youtube") {
        yt.play();
      }
      emitState();
    },

    pause() {
      wantsToPlay = false;
      audio.pause();
      yt.pause();
      emitState();
    },

    setVolume(v: number) {
      currentVolume = Math.max(0, Math.min(1, v));
      audio.volume = currentVolume;
      yt.setVolume(currentVolume);
      emitState();
    },

    seek(seconds: number) {
      if (activeSource === "audio") {
        audio.currentTime = seconds;
      } else {
        yt.seek(seconds);
      }
      emitState();
    },

    getCurrentTime() {
      return activeSource === "audio" ? audio.currentTime : yt.getCurrentTime();
    },

    getDuration() {
      return activeSource === "audio" ? audio.duration || 0 : yt.getDuration();
    },

    onStateChange(cb) {
      stateCbs.push(cb);
    },

    onEnded(cb) {
      endedCbs.push(cb);
    },

    onError(cb) {
      errorCbs.push(cb);
    },
  };
}
