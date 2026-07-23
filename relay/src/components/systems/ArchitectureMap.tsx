"use client";

import { motion } from "framer-motion";

const NODES = [
  { id: "web", label: "Web onboarding", sub: "HMAC webhooks", x: 8, y: 18 },
  { id: "slack", label: "Slack bots", sub: "cron · alerts", x: 8, y: 62 },
  { id: "relay", label: "Relay / Beige", sub: "command center", x: 40, y: 40 },
  { id: "supa", label: "Supabase", sub: "Postgres · RLS", x: 72, y: 18 },
  { id: "money", label: "RevenueCat", sub: "installs · $", x: 72, y: 62 },
];

const EDGES: [string, string][] = [
  ["web", "relay"],
  ["slack", "relay"],
  ["relay", "supa"],
  ["relay", "money"],
  ["supa", "money"],
];

function pos(id: string) {
  return NODES.find((n) => n.id === id)!;
}

export function ArchitectureMap() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(18,196,139,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,79,36,0.22), transparent 35%)",
        }}
      />
      <div className="relative p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.16em] text-white/55">
              Architecture
            </p>
            <h3 className="display text-2xl">One write path. Many readers.</h3>
          </div>
          <span className="live-dot hidden h-2 w-2 rounded-full bg-signal sm:block" />
        </div>

        <div className="relative h-[240px] w-full md:h-[280px]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {EDGES.map(([a, b], i) => {
              const A = pos(a);
              const B = pos(b);
              return (
                <motion.line
                  key={`${a}-${b}`}
                  x1={A.x + 8}
                  y1={A.y + 6}
                  x2={B.x}
                  y2={B.y + 6}
                  stroke="rgba(18,196,139,0.55)"
                  strokeWidth="0.4"
                  strokeDasharray="1.5 1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.15 * i, duration: 0.8 }}
                />
              );
            })}
          </svg>

          {NODES.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              className={`absolute w-[28%] min-w-[120px] max-w-[160px] rounded-xl border px-3 py-2 backdrop-blur-sm ${
                n.id === "relay"
                  ? "border-signal/50 bg-signal/15"
                  : "border-white/15 bg-white/8"
              }`}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              <p className="text-sm font-semibold leading-tight">{n.label}</p>
              <p className="mono mt-0.5 text-[10px] text-white/55">{n.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
