import { useEffect, useRef, useState } from "react";
import { getStats, type Stats } from "../api";
import { formatDuration } from "../format";

const POLL_MS = 10_000;

export default function StatsLine() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [displayRemaining, setDisplayRemaining] = useState(0);
  const fetchedAtRef = useRef(0);

  useEffect(() => {
    const load = () =>
      void getStats()
        .then((s) => {
          fetchedAtRef.current = Date.now();
          setStats(s);
          setDisplayRemaining(s.secondsRemaining);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Ticks the "left" countdown down every second between polls so it reads live
  // instead of jumping once every POLL_MS.
  useEffect(() => {
    if (!stats || stats.secondsRemaining <= 0) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - fetchedAtRef.current) / 1000);
      setDisplayRemaining(Math.max(0, stats.secondsRemaining - elapsed));
    }, 1000);
    return () => clearInterval(id);
  }, [stats]);

  if (!stats) return null;

  const overflow = stats.listeners - stats.listenersPreview.length;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-line bg-panel/60 px-3 py-2 text-[11px] uppercase tracking-widest text-dim">
      {stats.listenersPreview.length > 0 && (
        // Square, not round — border-radius is globally zeroed for the brutalist look, so this
        // reads as a stacked strip of ID-badge photos rather than fighting that with !important.
        <span className="flex items-center -space-x-1.5">
          {stats.listenersPreview.map((l) =>
            l.photoUrl ? (
              <img
                key={l.telegramId}
                src={l.photoUrl}
                alt={l.displayName}
                title={l.displayName}
                className="h-5 w-5 shrink-0 border border-black object-cover grayscale"
              />
            ) : (
              <span
                key={l.telegramId}
                title={l.displayName}
                className="flex h-5 w-5 shrink-0 items-center justify-center border border-black bg-line text-[9px] normal-case text-fg"
              >
                {l.displayName.replace("@", "")[0]?.toUpperCase()}
              </span>
            )
          )}
          {overflow > 0 && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-black bg-accent text-[9px] text-black">
              +{overflow}
            </span>
          )}
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping bg-accent opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 bg-accent" />
        </span>
        {stats.listeners} listening
      </span>
      <span className="text-line">|</span>
      <span>{stats.queueLength} queued</span>
      {displayRemaining > 0 && (
        <>
          <span className="text-line">|</span>
          <span>~{formatDuration(displayRemaining)} left</span>
        </>
      )}
    </div>
  );
}
