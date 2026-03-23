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
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-[var(--ink)]">Project Hub</span>
          <span className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Source
          </span>
        </div>

        <nav className="flex items-center">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/overview" && location.pathname.startsWith(item.to));

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative px-3 py-1 text-xs font-medium transition-colors ${
                  isActive ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-[var(--accent)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
