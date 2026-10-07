import { useState } from "react";
import { sendReaction } from "../api";
import { getClientId } from "../presence";

const EMOJI = ["🔥", "❤️", "💀", "😂", "👏", "🎧"];
const COOLDOWN_MS = 2000;

export default function ReactionBar() {
  const [cooling, setCooling] = useState<string | null>(null);

  const send = (emoji: string) => {
    if (cooling) return;
    setCooling(emoji);
    setTimeout(() => setCooling(null), COOLDOWN_MS);
    void sendReaction(emoji, getClientId()).catch(() => {});
  };

  return (
    <div className="flex items-center gap-1">
      {EMOJI.map((emoji) => (
        <button
          key={emoji}
          onClick={() => send(emoji)}
          disabled={cooling === emoji}
          title="Send a reaction"
          className="rounded-none px-1.5 py-1 text-base leading-none transition hover:scale-125 active:scale-95 disabled:scale-90 disabled:opacity-40"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
