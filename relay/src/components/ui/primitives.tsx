import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "signal" | "heat" | "amber" | "ink";
}) {
  const map = {
    neutral: "bg-bg text-ink-soft border-line",
    signal: "bg-signal-soft text-signal border-signal/20",
    heat: "bg-heat-soft text-heat border-heat/20",
    amber: "bg-amber-soft text-amber border-amber/20",
    ink: "bg-ink text-white border-ink",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
        map[tone],
      )}
    >
      {children}
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
  tone?: "ghost" | "ink" | "signal" | "heat";
  size?: "sm" | "md";
}) {
  const tones = {
    ghost: "border-line bg-white text-ink hover:bg-bg",
    ink: "border-ink bg-ink text-white hover:bg-ink/90",
    signal: "border-signal/30 bg-signal-soft text-signal hover:bg-signal/15",
    heat: "border-heat/30 bg-heat-soft text-heat hover:bg-heat/10",
  } as const;
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
  } as const;
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition disabled:opacity-40",
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

export function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink/30",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink/30",
        props.className,
      )}
    />
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-sidebar text-[10px] font-semibold text-white",
        size === "sm" ? "h-7 w-7" : "h-9 w-9 text-xs",
      )}
    >
      {initials}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mono mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
      {label}
    </div>
  );
}
