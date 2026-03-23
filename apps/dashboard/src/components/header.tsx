import { Link } from "@tanstack/react-router";

import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Operations" },
  ] as const;

  return (
    <div className="border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Falcon Connect
          </div>
          <nav className="flex gap-4 text-sm">
            {links.map(({ to, label }) => {
              return (
                <Link
                  key={to}
                  to={to}
                  className="text-muted-foreground transition hover:text-foreground"
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
