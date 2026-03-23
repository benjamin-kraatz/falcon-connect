import { Link, useLocation } from "@tanstack/react-router";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/mental-model", label: "Mental Model" },
  { to: "/connect-flow", label: "Connect Flow" },
  { to: "/runtime-calls", label: "Runtime Calls" },
  { to: "/sdk-internals", label: "SDK Internals" },
] as const;

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(11,16,21,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.48em] text-[var(--accent)]">
            Falcon Connect Demo 01
          </span>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl text-[var(--ink)]">Project Hub</h1>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
              Source App
            </span>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/overview" && location.pathname.startsWith(item.to));

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.26em] transition ${
                  isActive
                    ? "border-[var(--accent)] bg-[rgba(195,140,74,0.16)] text-[var(--ink)]"
                    : "border-white/10 text-[var(--muted)] hover:border-[rgba(195,140,74,0.45)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
