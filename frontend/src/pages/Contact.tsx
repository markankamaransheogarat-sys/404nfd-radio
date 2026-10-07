import { FormEvent, useState } from "react";
import { sendContact } from "../api";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await sendContact(name, email, message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
        <h1 className="mb-2 text-[clamp(1.35rem,5vw,1.75rem)] font-bold tracking-tight">
          CONTACT<span className="text-accent">_</span>
        </h1>
        <p className="animate-fade-up text-sm text-accent">&gt; message received. transmission logged.</p>
      </div>
    );
  }

  const fieldClass =
    "border border-line bg-panel px-3 py-2 text-sm outline-none transition-colors focus:border-accent placeholder:text-dim";

  return (
    <div className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
      <h1 className="mb-6 text-[clamp(1.35rem,5vw,1.75rem)] font-bold tracking-tight">
        CONTACT<span className="animate-pulse text-accent">_</span>
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="name"
          className={fieldClass}
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className={fieldClass}
        />
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="message"
          rows={5}
          className={fieldClass}
        />
        {error && <p className="animate-fade-up text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="border border-accent bg-accent px-4 py-2 text-sm font-bold uppercase tracking-widest text-black shadow-glow transition active:scale-[0.98] hover:bg-black hover:text-accent disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
