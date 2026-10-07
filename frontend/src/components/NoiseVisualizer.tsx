import { useEffect, useRef } from "react";
import { staticNoise } from "../player/staticNoise";

const BAR_COUNT = 12;

// Bars driven by real frequency data off the actual static-noise audio graph — mutates bar
// heights directly via refs instead of React state so this can run every animation frame
// without triggering a re-render 60 times a second.
export default function NoiseVisualizer() {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const levels = staticNoise.getLevels(BAR_COUNT);
      levels.forEach((level, i) => {
        const el = barsRef.current[i];
        if (el) el.style.transform = `scaleY(${Math.max(0.06, level)})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className="flex h-3.5 shrink-0 items-end gap-[2px]" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="h-full w-[2px] origin-bottom bg-accent/70"
        />
      ))}
    </span>
  );
}
