import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="animate-rise mb-7 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mono mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          {eyebrow}
        </p>
        <h1 className="display text-4xl leading-[0.95] text-ink md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function StatBlock({
  label,
  value,
  delta,
  hint,
  delay = 0,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <div
      className="panel animate-rise rounded-2xl p-4 md:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mono mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2 text-sm">
        {delta && (
          <span
            className={cn(
              "mono font-medium",
              delta.startsWith("-") ? "text-heat" : "text-signal-deep",
            )}
          >
            {delta}
          </span>
        )}
        {hint && <span className="text-muted">{hint}</span>}
      </div>
    </div>
  );
}

export function SectionTitle({
  title,
  aside,
}: {
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="display text-xl text-ink md:text-2xl">{title}</h2>
      {aside}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "signal" | "heat" | "amber" | "ink";
}) {
  const tones = {
    neutral: "bg-white/70 text-ink-soft border-line",
    signal: "bg-signal/15 text-signal-deep border-signal/25",
    heat: "bg-heat/12 text-heat border-heat/20",
    amber: "bg-amber/15 text-ink border-amber/30",
    ink: "bg-ink text-white border-ink",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
