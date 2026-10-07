import { useEffect, useState } from "react";
import { player } from "../player/player";
import type { NowPlaying } from "../api";

// Home never showed what's actually on air unless you looked at the fixed player bar — this
// gives it a real "now playing" focal point, with a spinning disc that visually reads as a
// physical broadcast rather than just another list row.
export default function NowPlayingCard() {
  const [track, setTrack] = useState<NowPlaying | null>(player.getCurrentTrack());
  const [mode, setMode] = useState(player.getMode());

  useEffect(() => {
    player.onTrackChange(setTrack);
    player.onModeChange(setMode);
  }, []);

  return (
    <div className="notch-lg mb-6 flex items-center gap-4 border border-line bg-panel/60 p-4">
      <div className="vinyl-disc relative h-16 w-16 shrink-0 overflow-hidden border-2 border-line bg-black sm:h-20 sm:w-20">
        {track?.thumbnailUrl ? (
          <img
            src={track.thumbnailUrl}
            alt=""
            className={`h-full w-full object-cover grayscale ${mode === "music" ? "animate-spin-slow" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-dim">♪</div>
        )}
        <div className="vinyl-grooves pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="vinyl-hole h-2.5 w-2.5 border border-accent bg-black" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-dim">
          {mode === "music" ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse bg-accent" /> on air now
            </>
          ) : (
            "no signal"
          )}
        </p>
        <p className="truncate font-display text-base font-bold text-fg sm:text-lg">{track?.title ?? "—"}</p>
        {track?.artist && <p className="truncate text-xs text-dim">{track.artist}</p>}
      </div>
    </div>
  );
}
