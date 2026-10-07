import { useEffect, useRef, useState } from "react";

// Scrolls its content sideways only when it doesn't fit in the available width;
// short text just sits still like a normal truncated line.
export default function MarqueeText({ text, className = "" }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const check = () => {
      const container = containerRef.current;
      const span = textRef.current;
      if (!container || !span) return;
      const gap = 48; // px of blank space between the looped copies
      const over = span.scrollWidth > container.clientWidth;
      setOverflowing(over);
      setDistance(span.scrollWidth + gap);
    };
    check();
    const ro = new ResizeObserver(check);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [text]);

  if (!overflowing) {
    return (
      <div ref={containerRef} className={`overflow-hidden ${className}`}>
        <span ref={textRef} className="inline-block whitespace-nowrap">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <div
        className="flex w-max whitespace-nowrap"
        style={{ animation: `marquee ${Math.max(distance / 40, 6)}s linear infinite` }}
      >
        <span ref={textRef} style={{ paddingRight: 48 }}>
          {text}
        </span>
        <span style={{ paddingRight: 48 }} aria-hidden="true">
          {text}
        </span>
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-${distance}px); }
        }
      `}</style>
    </div>
  );
}
