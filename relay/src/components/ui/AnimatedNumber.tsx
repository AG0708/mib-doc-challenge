"use client";

import { useEffect, useRef, useState } from "react";
import { formatCompact, formatUsd } from "@/lib/utils";

export function AnimatedNumber({
  value,
  format = "compact",
  duration = 900,
}: {
  value: number;
  format?: "compact" | "usd" | "raw" | "pct";
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    startRef.current = null;
    let frame = 0;

    const tick = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  if (format === "usd") return <>{formatUsd(display)}</>;
  if (format === "pct") return <>{display.toFixed(2)}%</>;
  if (format === "raw") return <>{Math.round(display).toLocaleString()}</>;
  return <>{formatCompact(display)}</>;
}
