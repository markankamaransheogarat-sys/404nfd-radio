import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getShow, type Show as ShowType } from "../api";
import { player } from "../player/player";

export default function Show() {
  const { id } = useParams<{ id: string }>();
  const [show, setShow] = useState<ShowType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getShow(id)
      .then(setShow)
      .catch((err) => setError(err instanceof Error ? err.message : "Not found"));
  }, [id]);

  if (error) return <div className="p-4 text-sm text-accent">{error}</div>;
  if (!show) return <div className="p-4 text-sm text-dim">loading…</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
      <h1 className="mb-2 text-[clamp(1.35rem,5vw,1.75rem)] font-bold tracking-tight">{show.title}</h1>
      <p className="mb-6 text-sm text-dim">{show.description}</p>
      <button
        onClick={() => player.play()}
        className="w-full border border-accent bg-accent px-6 py-3 text-sm font-bold uppercase tracking-widest text-black shadow-glow transition active:scale-[0.98] hover:bg-black hover:text-accent sm:w-auto"
      >
        ▶ Listen to the radio
      </button>
    </div>
  );
}
