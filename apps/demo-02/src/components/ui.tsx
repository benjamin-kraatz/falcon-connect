import { Link } from "@tanstack/react-router";
import type { PropsWithChildren, ReactNode } from "react";

export function PageFrame({
  eyebrow,
  title,
  intro,
  aside,
  children,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  intro: string;
  aside?: ReactNode;
}>) {
  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 overflow-hidden px-5 py-8">
      <div className="flex flex-col gap-6 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--accent)]">
            {eyebrow}
          </p>
          <h2 className="text-2xl font-semibold leading-snug text-[var(--ink)]">{title}</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">{intro}</p>
        </div>
        {aside ? <div className="shrink-0 lg:w-72">{aside}</div> : null}
      </div>
      {children}
    </main>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}>) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
            {title}
          </h3>
          {subtitle ? <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: PropsWithChildren<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
  }
>) {
  const tone =
    variant === "primary"
      ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] hover:opacity-90"
      : variant === "secondary"
        ? "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--accent-ring)]"
        : "border-transparent bg-transparent text-[var(--muted)] hover:text-[var(--ink)]";

  return (
    <button
      {...props}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function StatusPill({
  tone,
  children,
}: PropsWithChildren<{ tone: "good" | "warn" | "bad" | "neutral" }>) {
  const className =
    tone === "good"
      ? "border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.1)] text-[var(--good)]"
      : tone === "warn"
        ? "border-[rgba(251,146,60,0.3)] bg-[rgba(251,146,60,0.1)] text-[var(--warn)]"
        : tone === "bad"
          ? "border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] text-[var(--bad)]"
          : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]";

  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

export function JsonCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)]">
      <div className="border-b border-[var(--line)] px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <pre className="p-4 text-xs leading-6 text-[var(--ink)] [white-space:pre-wrap] [word-break:break-all]">
        {value}
      </pre>
    </div>
  );
}

export function RouteLink({
  to,
  title,
  description,
}: {
  to: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start justify-between rounded-md border border-[var(--line)] bg-[var(--panel)] px-4 py-3 transition-colors hover:border-[var(--accent-ring)] hover:bg-[var(--panel-strong)]"
    >
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
          {title}
        </p>
        <p className="text-xs leading-5 text-[var(--muted)]">{description}</p>
      </div>
      <span className="mt-0.5 shrink-0 text-[var(--muted)] transition-colors group-hover:text-[var(--accent)]">
        →
      </span>
    </Link>
  );
}
