import { useEffect, useState } from "react";
import { getHistory, getTopUsers, type HistoryEntry, type TopUser } from "../api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return `${WEEKDAYS[d.getUTCDay()]} ${time}`;
}

export default function History() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHistory(), getTopUsers()])
      .then(([h, t]) => {
        setEntries(h);
        setTopUsers(t);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
      <h1 className="mb-1 text-[clamp(1.35rem,5vw,1.75rem)] font-bold tracking-tight">
        HISTORY<span className="animate-pulse text-accent">_</span>
      </h1>
      <p className="mb-6 text-sm text-dim">// last 7 days broadcast log</p>

      {loading && (
        <div className="mb-8 flex flex-col gap-px border border-line">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse border-b border-line bg-panel last:border-b-0" />
          ))}
        </div>
      )}

      {!loading && topUsers.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">&gt; top diggers, 7d</h2>
          <ol className="border border-line">
            {topUsers.map((u, i) => (
              <li
                key={u.telegramId}
                className="flex items-center gap-3 border-b border-line px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-white/[0.03]"
              >
                <span
                  className={`flex w-5 shrink-0 justify-center text-xs font-bold ${
                    i === 0 ? "text-accent [text-shadow:0_0_8px_rgba(255,26,47,0.7)]" : "text-dim"
                  }`}
                >
                  {i + 1}
                </span>
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt="" className="h-6 w-6 shrink-0 rounded-sm object-cover grayscale" />
                ) : (
                  <span className="h-6 w-6 shrink-0 border border-line" />
                )}
                <span className="min-w-0 flex-1 truncate">{u.displayName}</span>
                <span className="shrink-0 text-xs text-accent">{u.plays} track{u.plays === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">&gt; played</h2>
      {!loading && entries.length === 0 && (
        <p className="border border-dashed border-line px-4 py-8 text-center text-sm text-dim">
          nothing played this week yet.
        </p>
      )}
      <ul className="flex flex-col border border-line">
        {entries.map((e, i) => (
          <li
            key={`${e.videoId}-${e.startedAt}-${i}`}
            className="flex items-center gap-3 border-b border-line p-2.5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
          >
            <span className="shrink-0 font-mono text-xs text-dim">{formatTime(e.startedAt)}</span>
            {e.thumbnailUrl && (
              <img src={e.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 object-cover grayscale" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{e.title}</p>
              <p className="truncate text-xs text-dim">
                {e.artist}
                {e.submittedBy ? ` · queued by ${e.submittedBy}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
