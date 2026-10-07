import { useEffect, useRef, useState } from "react";
import { player } from "../player/player";
import type { NowPlaying } from "../api";
import MarqueeText from "./MarqueeText";
import SkipVote from "./SkipVote";
import ReactionBar from "./ReactionBar";
import NoiseVisualizer from "./NoiseVisualizer";

const PROGRESS_TICK_MS = 500;

export default function PlayerBar() {
  const [track, setTrack] = useState<NowPlaying | null>(player.getCurrentTrack());
  const [mode, setMode] = useState(player.getMode());
  const [playing, setPlaying] = useState(player.isPlaying());
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    player.onTrackChange((t) => {
      setError(null);
      setProgress(0);
      setTrack(t);
    });
    player.onModeChange(setMode);
    player.onPlayingChange(setPlaying);
    player.onError((message) => {
      setError(message);
      setTimeout(() => setError((current) => (current === message ? null : current)), 6000);
    });
  }, []);

  // Purely cosmetic — the actual playback sync lives in player.ts. This just samples it often
  // enough for a smooth-looking progress line under the bar.
  useEffect(() => {
    rafRef.current = setInterval(() => {
      const { current, duration } = player.getProgress();
      setProgress(duration > 0 ? Math.min(1, current / duration) : 0);
    }, PROGRESS_TICK_MS);
    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
  }, []);

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-black/95 backdrop-blur-md"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -1px 0 0 rgba(255,26,47,0.15), 0 -8px 24px -12px rgba(0,0,0,0.8)",
      }}
    >
      {/* Broadcast-clock progress line — purely cosmetic, tracks the actual server-synced
          position sampled from player.getProgress(). */}
      <div className="h-px w-full bg-line">
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-linear"
          style={{ width: `${mode === "music" ? progress * 100 : 0}%`, boxShadow: "0 0 6px rgba(255,26,47,0.8)" }}
        />
      </div>

      {mode === "music" && track?.phraseText && (
        <div className="animate-fade-up border-b border-accent/40 bg-accent/10 px-4 py-2">
          <p className="truncate text-sm italic text-accent">
            &gt; {track.phraseText}
            {track.phraseAuthor ? ` /${track.phraseAuthor}` : ""}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
        {/* YouTube's IFrame API replaces this element outright with an <iframe> (same id, but a
            different DOM node) — if React ever re-rendered a JSX element at this exact spot, its
            reconciler would blow that iframe away on the next diff (it still thinks this is the
            plain <div> it originally created) and playback would silently die. So JSX renders
            only this empty, never-touched-again wrapper; player.ts creates the actual mount
            point inside it imperatively, entirely outside React's reconciliation. Kept small
            (not hidden — YouTube's terms require the player stay visible while playing) while
            music is on; collapsed to 0 while static plays, since no YouTube content loads then. */}
        <div
          id={player.wrapperId}
          className="shrink-0 overflow-hidden border border-line"
          style={mode === "music" ? { width: 40, height: 22 } : { width: 0, height: 0, border: "none" }}
        />

        {mode === "static" ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <NoiseVisualizer />
            <p className="truncate text-xs uppercase tracking-widest text-dim">no signal — searching…</p>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {playing && (
              <span className="flex h-3.5 shrink-0 items-end gap-[3px]" aria-hidden="true">
                <span className="h-full w-[3px] origin-bottom animate-eq1 bg-accent shadow-glow-sm" />
                <span className="h-full w-[3px] origin-bottom animate-eq2 bg-accent shadow-glow-sm" />
                <span className="h-full w-[3px] origin-bottom animate-eq3 bg-accent shadow-glow-sm" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <MarqueeText text={track?.title ?? "—"} className="font-display text-sm font-bold sm:text-base" />
              {track?.artist && <MarqueeText text={track.artist} className="text-xs text-dim" />}
            </div>
          </div>
        )}

        {mode === "music" && track && <SkipVote videoId={track.videoId} />}

        <button
          onClick={toggle}
          className={
            playing
              ? "flex shrink-0 items-center gap-1.5 border border-accent bg-accent px-3 py-2 text-xs font-bold uppercase tracking-widest text-black shadow-glow transition active:scale-95 hover:bg-black hover:text-accent sm:px-4"
              : "shrink-0 border border-accent px-3 py-2 text-xs font-bold uppercase tracking-widest text-accent transition active:scale-95 hover:bg-accent hover:text-black sm:px-4"
          }
        >
          {playing ? (
            <>
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-black" /> On Air
            </>
          ) : (
            "▶ Play"
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          defaultValue={1}
          onChange={(e) => player.setVolume(Number(e.target.value))}
          className="hidden w-16 accent-accent sm:block"
          aria-label="Volume"
        />
      </div>

      <div className="flex items-center justify-center border-t border-line/60 py-1">
        <ReactionBar />
      </div>

      {error && <p className="animate-fade-up bg-accent/20 px-4 py-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
