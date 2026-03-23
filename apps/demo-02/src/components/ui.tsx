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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8">
      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(105,220,255,0.16),transparent_42%),rgba(7,18,28,0.9)] p-6 shadow-[var(--shadow)] lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.42em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="max-w-3xl font-display text-4xl leading-tight text-[var(--ink)]">
            {title}
          </h2>
          <p className="max-w-3xl text-base leading-7 text-[var(--muted)]">{intro}</p>
        </div>
        {aside ? <div>{aside}</div> : null}
      </section>
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
    <section className="rounded-[1.5rem] border border-white/10 bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h3 className="font-display text-2xl text-[var(--ink)]">{title}</h3>
          {subtitle ? <p className="text-sm leading-6 text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: PropsWithChildren<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
  }
>) {
  const tone =
    variant === "primary"
      ? "border-[var(--accent)] bg-[var(--accent)] text-[#052031]"
      : variant === "danger"
        ? "border-[rgba(255,133,120,0.4)] bg-[rgba(255,133,120,0.12)] text-[var(--bad)]"
        : "border-white/10 bg-white/5 text-[var(--ink)]";

  return (
    <button
      {...props}
      className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.26em] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${props.className ?? ""}`}
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
      ? "border-[rgba(132,240,180,0.35)] bg-[rgba(132,240,180,0.12)] text-[var(--good)]"
      : tone === "warn"
        ? "border-[rgba(255,210,125,0.3)] bg-[rgba(255,210,125,0.12)] text-[var(--warn)]"
        : tone === "bad"
          ? "border-[rgba(255,133,120,0.35)] bg-[rgba(255,133,120,0.12)] text-[var(--bad)]"
          : "border-white/10 bg-white/5 text-[var(--muted)]";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${className}`}
    >
      {children}
    </span>
  );
}

export function JsonCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-[var(--panel-strong)]">
      <div className="border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
        {label}
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-[var(--ink)]">{value}</pre>
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
      className="group rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4 transition hover:border-[rgba(105,220,255,0.35)] hover:bg-[rgba(105,220,255,0.08)]"
    >
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--accent)]">{title}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </Link>
  );
}
