import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../api";

interface FloatingReaction {
  id: number;
  emoji: string;
  left: number; // vw
  drift: number; // px, final horizontal offset
  duration: number; // seconds
}

let nextId = 0;

// Full-viewport, click-through layer that turns every reaction event (this client's own presses
// included — they arrive back over the same SSE stream everyone else gets) into an emoji that
// floats up and fades, so a burst feels like something the whole room just did together.
export default function ReactionOverlay() {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/reactions-stream`);
    es.onmessage = (ev) => {
      try {
        const { emoji } = JSON.parse(ev.data) as { emoji: string };
        const id = nextId++;
        const duration = 2.2 + Math.random() * 0.8;
        setReactions((prev) => [
          ...prev,
          { id, emoji, left: 10 + Math.random() * 80, drift: Math.random() * 80 - 40, duration },
        ]);
        const t = setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id));
          timeoutsRef.current.delete(t);
        }, duration * 1000);
        timeoutsRef.current.add(t);
      } catch {
        // malformed event — nothing worth showing, just drop it
      }
    };
    return () => {
      es.close();
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden="true">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="absolute bottom-24 text-3xl"
          style={{
            left: `${r.left}vw`,
            animation: `float-up-${r.id} ${r.duration}s ease-out forwards`,
          }}
        >
          {r.emoji}
          <style>{`
            @keyframes float-up-${r.id} {
              0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
              15% { transform: translate(0, -10vh) scale(1.1); opacity: 1; }
              100% { transform: translate(${r.drift}px, -70vh) scale(0.9); opacity: 0; }
            }
          `}</style>
        </span>
      ))}
    </div>
  );
}
