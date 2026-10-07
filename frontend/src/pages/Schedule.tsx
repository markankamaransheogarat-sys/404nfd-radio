import { useEffect, useState } from "react";
import { getSchedule, type ScheduleSlot } from "../api";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Schedule() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchedule()
      .then(setSlots)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4 pb-40 sm:p-6">
      <h1 className="mb-1 text-[clamp(1.35rem,5vw,1.75rem)] font-bold tracking-tight">
        SCHEDULE<span className="animate-pulse text-accent">_</span>
      </h1>
      <p className="mb-6 text-sm text-dim">// UTC broadcast log</p>
      {loading && (
        <div className="flex flex-col gap-px border border-line">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-11 animate-pulse border-b border-line bg-panel last:border-b-0" />
          ))}
        </div>
      )}
      {!loading && slots.length === 0 && (
        <p className="border border-dashed border-line px-4 py-8 text-center text-sm text-dim">
          nothing scheduled yet.
        </p>
      )}
      {!loading && slots.length > 0 && (
        <table className="w-full border border-line text-sm">
          <tbody>
            {slots.map((s) => (
              <tr key={s.id} className="border-b border-line transition-colors last:border-b-0 hover:bg-white/[0.03]">
                <td className="py-2.5 pl-3 pr-4 text-dim">{DAYS[s.day_of_week]}</td>
                <td className="py-2.5 pr-4 font-medium text-accent">{s.start_time}</td>
                <td className="py-2.5 pr-3">{s.show_title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
