import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import { useTargetDemoState } from "@/lib/use-target-state";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/mental-model", label: "Mental Model" },
  { to: "/connect-flow", label: "Connect Flow" },
  { to: "/runtime-calls", label: "Runtime Calls" },
  { to: "/sdk-internals", label: "SDK Internals" },
] as const;

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, updateState } = useTargetDemoState();

  const signOut = () => {
    updateState((current) => ({ ...current, session: null }));
    void navigate({ to: "/overview" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(5,12,18,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.48em] text-[var(--accent)]">
            Falcon Connect Demo 02
          </span>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl text-[var(--ink)]">Incident Ops</h1>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
              Target App
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
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
                      ? "border-[var(--accent)] bg-[rgba(105,220,255,0.12)] text-[var(--ink)]"
                      : "border-white/10 text-[var(--muted)] hover:border-[rgba(105,220,255,0.35)] hover:text-[var(--ink)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            <span>{state.session ? state.session.name : "Signed out"}</span>
            {state.session ? (
              <button className="text-[var(--ink)]" onClick={signOut}>
                Sign out
              </button>
            ) : (
              <Link to="/login" search={{ redirect: location.href }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
