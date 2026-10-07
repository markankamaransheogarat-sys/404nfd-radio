import { useEffect, useState } from "react";
import { getMyHistory, type HistoryEntry } from "../api";
import { useAuthUser } from "../auth";
import TelegramLogin from "../components/TelegramLogin";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export default function MyTracks() {
  const user = useAuthUser();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMyHistory()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [user]);

  if (user === undefined) return null; // still resolving auth state

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
        <h1 className="mb-1 text-[clamp(1.35rem,5vw,1.75rem)] font-bold tracking-tight">
          MY TRACKS<span className="animate-pulse text-accent">_</span>
        </h1>
        <div className="mt-4 flex flex-col items-start gap-3 border border-line bg-panel px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-dim">&gt; log in with Telegram to see your tracks</p>
          <TelegramLogin />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
      <h1 className="mb-1 text-[clamp(1.35rem,5vw,1.75rem)] font-bold tracking-tight">
        MY TRACKS<span className="animate-pulse text-accent">_</span>
      </h1>
      <p className="mb-6 text-sm text-dim">// what you put on the air, last 24h</p>

      {loading && (
        <div className="flex flex-col gap-px border border-line">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse border-b border-line bg-panel last:border-b-0" />
          ))}
        </div>
      )}
      {!loading && entries.length === 0 && (
        <p className="border border-dashed border-line px-4 py-8 text-center text-sm text-dim">
          you haven't queued anything in the last 24h.
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
              {e.artist && <p className="truncate text-xs text-dim">{e.artist}</p>}
            </div>
            <span className="shrink-0 text-xs uppercase tracking-widest text-accent">✓ played</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
