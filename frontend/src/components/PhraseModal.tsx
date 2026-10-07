import { useState } from "react";
import { attachPhrase } from "../api";

export default function PhraseModal({
  videoId,
  onClose,
}: {
  videoId: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim()) return onClose();
    setSubmitting(true);
    try {
      await attachPhrase(videoId, text.trim(), author.trim() || undefined);
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  const fieldClass =
    "w-full border border-line bg-black px-3 py-2 text-sm outline-none transition-colors focus:border-accent placeholder:text-dim";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-scale-in border border-accent bg-panel p-4 shadow-glow">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-accent">&gt; attach a transmission</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="a shoutout, a dedication, whatever…"
          className={fieldClass}
        />
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          maxLength={64}
          placeholder="your name (optional)"
          className={`mt-2 ${fieldClass}`}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-xs uppercase tracking-widest text-dim hover:text-fg">
            Skip
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="border border-accent bg-accent px-4 py-2 text-xs font-bold uppercase tracking-widest text-black transition active:scale-95 hover:bg-black hover:text-accent disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
