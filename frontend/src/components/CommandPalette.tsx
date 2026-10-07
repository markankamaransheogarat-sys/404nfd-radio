import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { player } from "../player/player";
import { useAuthUser } from "../auth";

interface Command {
  label: string;
  action: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(player.isPlaying());
  const navigate = useNavigate();
  const user = useAuthUser();

  useEffect(() => {
    player.onPlayingChange(setPlaying);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenRequest = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  if (!open) return null;

  const commands: Command[] = [
    { label: "Go home", action: () => navigate("/") },
    { label: "Schedule", action: () => navigate("/schedule") },
    { label: "History", action: () => navigate("/history") },
    ...(user ? [{ label: "My tracks", action: () => navigate("/mine") }] : []),
    { label: "Contact", action: () => navigate("/contact") },
    { label: playing ? "Pause radio" : "Play radio", action: () => (playing ? player.pause() : player.play()) },
    { label: "Join the Telegram channel", action: () => window.open("https://t.me/NFD404radio", "_blank") },
  ];

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  const run = (c: Command) => {
    c.action();
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="notch-lg w-full max-w-md animate-scale-in border border-accent bg-panel shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <span className="text-accent">&gt;</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="type a command..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-dim"
          />
          <kbd className="shrink-0 border border-line px-1.5 py-0.5 text-[10px] text-dim">ESC</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {filtered.length === 0 && <li className="px-3 py-3 text-xs text-dim">no matches</li>}
          {filtered.map((c) => (
            <li key={c.label}>
              <button
                onClick={() => run(c)}
                className="flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/10 hover:text-accent"
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
