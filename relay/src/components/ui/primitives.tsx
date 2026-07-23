import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const AVATAR_TONES = [
  "bg-[#0fb981]/20 text-[#0a8f63]",
  "bg-[#ff5a2a]/18 text-[#c93d14]",
  "bg-[#0d1420]/12 text-[#0d1420]",
  "bg-[#e8a317]/22 text-[#8a5f00]",
  "bg-[#3b82f6]/18 text-[#1d4ed8]",
];

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tone = AVATAR_TONES[name.length % AVATAR_TONES.length];
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        tone,
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Button({
  children,
  className,
  tone = "ghost",
  size = "md",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "ghost" | "ink" | "signal" | "heat" | "amber";
  size?: "sm" | "md";
}) {
  const tones = {
    ghost: "border-line bg-white/75 text-ink hover:bg-white",
    ink: "border-ink bg-ink text-white hover:bg-ink/90",
    signal: "border-signal/40 bg-signal/15 text-signal-deep hover:bg-signal/25",
    heat: "border-heat/30 bg-heat/12 text-heat hover:bg-heat/18",
    amber: "border-amber/35 bg-amber/15 text-ink hover:bg-amber/25",
  } as const;
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
  } as const;
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition disabled:opacity-40",
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-line bg-white/80 px-3 py-2.5 text-sm outline-none ring-signal/25 transition placeholder:text-muted/80 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-xl border border-line bg-white/80 px-3 py-2.5 text-sm outline-none ring-signal/25 focus:ring-2",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

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
      <div className="max-w-2xl">
        <p className="mono mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          {eyebrow}
        </p>
        <h1 className="display text-[2.6rem] leading-[0.95] text-ink md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function StatBlock({
  label,
  value,
  numericValue,
  valueFormat = "compact",
  delta,
  hint,
  delay = 0,
  spark,
}: {
  label: string;
  value?: string;
  numericValue?: number;
  valueFormat?: "compact" | "usd" | "raw" | "pct";
  delta?: string;
  hint?: string;
  delay?: number;
  spark?: number[];
}) {
  const max = spark ? Math.max(...spark, 1) : 1;
  return (
    <div
      className="panel animate-rise group relative overflow-hidden rounded-2xl p-4 md:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-signal/10 blur-2xl transition group-hover:bg-signal/20" />
      <p className="mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mono mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {typeof numericValue === "number" ? (
          <AnimatedNumber value={numericValue} format={valueFormat} />
        ) : (
          value
        )}
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
      {spark && (
        <div className="mt-3 flex h-8 items-end gap-0.5">
          {spark.map((n, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm bg-ink/15 transition group-hover:bg-signal/50"
              style={{ height: `${Math.max(12, (n / max) * 100)}%` }}
            />
          ))}
        </div>
      )}
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

export function PlatformDot({ platform }: { platform: string }) {
  const color =
    platform === "tiktok"
      ? "bg-ink"
      : platform === "instagram"
        ? "bg-heat"
        : "bg-signal";
  return (
    <span className="inline-flex items-center gap-1.5 capitalize">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {platform}
    </span>
  );
}
