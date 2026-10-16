"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown used by the Deal-of-the-Day header.
 *
 * Renders a placeholder until mounted so the server-rendered HTML and the first
 * client render agree — otherwise React would report a hydration mismatch on
 * every visit.
 */

function remaining(until: string | null) {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  return ms > 0 ? ms : 0;
}

/** Splits a millisecond duration into padded units. */
function parts(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function Countdown({ until }: { until: string | null }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    setLeft(remaining(until));
    if (!until) return;

    const timer = window.setInterval(() => {
      const next = remaining(until);
      setLeft(next);
      if (next === 0) window.clearInterval(timer);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [until]);

  if (left === null) {
    return <div className="h-9 w-40 animate-pulse rounded-lg bg-white/10" aria-hidden />;
  }

  if (left === 0) {
    return (
      <p className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/90">
        Today&apos;s deals have ended — check back tomorrow.
      </p>
    );
  }

  const { hours, minutes, seconds } = parts(left);

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-live="off">
      {(
        [
          ["hrs", hours],
          ["min", minutes],
          ["sec", seconds],
        ] as const
      ).map(([label, value], i) => (
        <div key={label} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-xs font-bold text-white/50">:</span> : null}
          <div className="min-w-[2.25rem] rounded-md bg-white/10 px-1.5 py-1 text-center">
            <div className="text-sm font-bold tabular-nums leading-none text-white">
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-white/50">
              {label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}