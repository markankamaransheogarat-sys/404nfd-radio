import { FormEvent, useEffect, useState } from "react";
import { addToQueue, searchTracks, type SearchResult } from "../api";
import { useAuthUser } from "../auth";
import { formatDuration } from "../format";
import { getClientId } from "../presence";
import { player } from "../player/player";
import PhraseModal from "../components/PhraseModal";
import StatsLine from "../components/StatsLine";
import TelegramLogin from "../components/TelegramLogin";
import NowPlayingCard from "../components/NowPlayingCard";

export default function Home() {
  const user = useAuthUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phraseTarget, setPhraseTarget] = useState<string | null>(null);
  const [queueing, setQueueing] = useState<string | null>(null);
  const [playing, setPlaying] = useState(player.isPlaying());

  useEffect(() => {
    player.onPlayingChange(setPlaying);
  }, []);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchTracks(query.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const queueTrack = async (r: SearchResult) => {
    setError(null);
    setQueueing(r.videoId);
    try {
      await addToQueue({
        videoId: r.videoId,
        title: r.title,
        artist: r.channelTitle,
        thumbnailUrl: r.thumbnailUrl,
        durationSeconds: r.durationSeconds,
        clientId: getClientId(),
      });
      player.refreshNow(); // don't wait up to 8s to see it if the queue was empty and this auto-started
      setPhraseTarget(r.videoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue");
    } finally {
      setQueueing(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2.5 font-display text-[clamp(1.5rem,6vw,2.25rem)] font-bold leading-none tracking-tight">
            <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 rounded-sm shadow-glow-sm sm:h-9 sm:w-9" />
            404NFD{" "}
            <span className="text-accent [text-shadow:0_0_18px_rgba(255,26,47,0.55)]">RADIO</span>
          </h1>
          <p className="text-xs text-dim sm:text-sm">// the internet's lost &amp; found, playing on shuffle.</p>
        </div>
        <StatsLine />
      </div>

      <NowPlayingCard />

      <button
        onClick={() => (playing ? player.pause() : player.play())}
        className={
          playing
            ? "notch group mb-8 flex w-full items-center justify-center gap-2 border border-accent px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-accent transition active:scale-[0.98] hover:bg-accent hover:text-black sm:w-auto"
            : "notch group mb-8 flex w-full items-center justify-center gap-2 border border-accent bg-accent px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-black shadow-glow transition active:scale-[0.98] hover:bg-black hover:text-accent sm:w-auto"
        }
      >
        {playing ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping bg-current opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 bg-current" />
            </span>
            On Air
          </>
        ) : (
          "▶ Listen Live"
        )}
      </button>

      {user === null && (
        <div className="mb-4 flex flex-col items-start gap-3 border border-accent/40 bg-accent/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-dim">&gt; log in with Telegram to queue a track</p>
          <TelegramLogin />
        </div>
      )}

      <form onSubmit={search} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="find a song..."
            className="w-full border border-line bg-panel py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 border border-line px-4 py-2.5 text-xs uppercase tracking-widest text-dim transition-colors hover:border-fg hover:text-fg disabled:opacity-50"
        >
          {searching ? (
            <span className="inline-block h-3 w-3 animate-spin border border-dim border-t-transparent" />
          ) : (
            "Search"
          )}
        </button>
      </form>

      {error && <p className="mb-4 animate-fade-up text-sm text-accent">&gt; {error}</p>}

      <ul className="flex flex-col gap-px border border-line">
        {results.map((r) => (
          <li
            key={r.videoId}
            className="group flex animate-fade-up items-center gap-3 border-b border-line bg-panel p-2.5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
          >
            <img
              src={r.thumbnailUrl}
              alt=""
              className="h-12 w-12 shrink-0 object-cover grayscale transition-all duration-200 group-hover:grayscale-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{r.title}</p>
              <p className="truncate text-xs text-dim">
                {r.channelTitle}
                {r.durationSeconds > 0 ? ` · ${formatDuration(r.durationSeconds)}` : ""}
              </p>
            </div>
            <button
              onClick={() => queueTrack(r)}
              disabled={!user || queueing === r.videoId}
              title={user ? undefined : "Log in with Telegram to queue a track"}
              className="shrink-0 whitespace-nowrap border border-accent px-3 py-1.5 text-xs uppercase tracking-wide text-accent transition active:scale-95 hover:bg-accent hover:text-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-accent"
            >
              {queueing === r.videoId ? "…" : "+ Queue"}
            </button>
          </li>
        ))}
      </ul>

      {phraseTarget && <PhraseModal videoId={phraseTarget} onClose={() => setPhraseTarget(null)} />}
    </div>
  );
}
