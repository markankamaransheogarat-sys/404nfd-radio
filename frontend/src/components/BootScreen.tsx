import { useEffect, useState } from "react";

// Once per browser tab, not every page — a boot sequence that replayed on every route change or
// reload would stop feeling like a broadcast system powering on and start feeling like a bug.
const STORAGE_KEY = "404nfd_booted";

const LINES = [
  "INITIALIZING 404NFD BROADCAST SYSTEM",
  "SYNCING AUDIO CORE... OK",
  "LOCKING BROADCAST CLOCK... OK",
  "ESTABLISHING UPLINK... OK",
];

function hasBooted(): boolean {
  try {
    return !!sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return true; // storage blocked (private mode, etc.) — never let this block the actual site
  }
}

function markBooted(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // nothing to do — worst case it plays again next tab
  }
}

export default function BootScreen() {
  const [visible, setVisible] = useState(() => !hasBooted());
  const [lineCount, setLineCount] = useState(0);
  const [collapsing, setCollapsing] = useState(false);

  const dismiss = () => {
    markBooted();
    setVisible(false);
  };

  useEffect(() => {
    if (!visible || collapsing) return;
    if (lineCount < LINES.length) {
      const t = setTimeout(() => setLineCount((n) => n + 1), 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCollapsing(true), 350);
    return () => clearTimeout(t);
  }, [visible, collapsing, lineCount]);

  useEffect(() => {
    if (!collapsing) return;
    const t = setTimeout(dismiss, 420);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsing]);

  if (!visible) return null;

  return (
    <div
      onClick={dismiss}
      className={`fixed inset-0 z-[200] flex cursor-pointer items-center justify-center bg-black font-mono transition-all duration-[420ms] ease-in ${
        collapsing ? "scale-y-0 opacity-0" : "scale-y-100 opacity-100"
      }`}
    >
      <div className="w-full max-w-sm px-6">
        {LINES.slice(0, lineCount).map((line, i) => (
          <p key={i} className="mb-1.5 animate-fade-up text-sm text-accent/90">
            &gt; {line}
          </p>
        ))}
        {lineCount < LINES.length && <span className="animate-pulse text-accent">_</span>}
      </div>
    </div>
  );
}
