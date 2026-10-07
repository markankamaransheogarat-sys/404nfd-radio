import { useEffect, useState } from "react";
import { getNowPlaying, getStats, type NowPlaying } from "../api";

const POLL_MS = 8000;

// Standalone — meant to be dropped in an <iframe src="https://404nfd.net/widget"> on someone
// else's site, not visited directly. App.tsx renders this alone, skipping header/nav/player/
// boot screen entirely, so it stays small and has no dependency on anything else booting up.
export default function Widget() {
  const [track, setTrack] = useState<NowPlaying | null>(null);
  const [listeners, setListeners] = useState(0);

  useEffect(() => {
    const load = () => {
      void getNowPlaying().then(setTrack).catch(() => {});
      void getStats()
        .then((s) => setListeners(s.listeners))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <a
      href="https://404nfd.net"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 border border-line bg-black p-3 font-mono text-fg no-underline"
    >
      <div className="vinyl-disc relative h-10 w-10 shrink-0 overflow-hidden border-2 border-line bg-black">
        {track?.thumbnailUrl ? (
          <img src={track.thumbnailUrl} alt="" className="h-full w-full animate-spin-slow object-cover grayscale" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-dim">♪</div>
        )}
        <div className="vinyl-grooves pointer-events-none absolute inset-0" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-accent">
          {track ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse bg-accent" /> 404nfd — on air
            </>
          ) : (
            "404nfd — no signal"
          )}
        </p>
        <p className="truncate font-display text-sm font-bold leading-tight">{track?.title ?? "—"}</p>
        <p className="truncate text-[10px] text-dim">{listeners} listening now</p>
      </div>
    </a>
  );
}
