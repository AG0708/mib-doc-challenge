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
    <header className="mb-3 flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.15rem] font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 max-w-3xl text-[12px] text-muted">{description}</p>
        )}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{action}</div> : null}
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
    signal: "bg-signal-soft text-signal border-signal/25",
    heat: "bg-heat-soft text-heat border-heat/25",
    amber: "bg-amber-soft text-amber border-amber/25",
    ink: "bg-ink text-white border-ink",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.05em]",
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
    signal: "border-signal/30 bg-signal-soft text-signal hover:bg-signal/10",
    heat: "border-heat/30 bg-heat-soft text-heat hover:bg-heat/10",
  } as const;
  const sizes = {
    sm: "px-2 py-1 text-[11px]",
    md: "px-2.5 py-1.5 text-[12px]",
  } as const;
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[5px] border font-medium transition disabled:opacity-40",
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
        "w-full rounded-[5px] border border-line bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-ink/35",
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
        "rounded-[5px] border border-line bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-ink/35",
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
        "inline-flex shrink-0 items-center justify-center rounded bg-sidebar font-semibold text-white",
        size === "sm" ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]",
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
  className,
  bare = false,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0",
        !bare && "card px-2.5 py-2",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mono mt-1 text-[1.25rem] font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-[6px] border border-dashed border-line px-3 py-6 text-center text-[12px] text-muted">
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-line/80", className)} />
  );
}

export function StatSkeleton({ bare = false }: { bare?: boolean }) {
  return (
    <div className={cn("min-w-0", !bare && "card px-2.5 py-2")}>
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="mt-2 h-6 w-20" />
      <Skeleton className="mt-1.5 h-2.5 w-14" />
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      <div className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {action}
      </div>
      <div className="p-2.5">{children}</div>
    </section>
  );
}
