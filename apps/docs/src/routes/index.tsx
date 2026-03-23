import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";

import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-1 flex-col justify-center px-4 py-8 text-center">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.35em] text-fd-muted-foreground">
            Partner Handbook
          </p>
          <h1 className="text-4xl font-medium tracking-tight">
            Directional app integrations with{" "}
            <span className="bg-linear-to-r from-fd-primary to-fuchsia-500 bg-clip-text text-transparent">
              FALCON Connect
            </span>
          </h1>
          <p className="text-base text-fd-muted-foreground">
            These docs explain trusted app registration, signed install intents, target-app consent,
            FALCON-issued runtime verification tokens, and fallback introspection.
          </p>
        </div>
        <Link
          to="/docs/$"
          params={{
            _splat: "",
          }}
          className="mx-auto mt-6 rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
        >
          Open the partner docs
        </Link>
      </div>
    </HomeLayout>
  );
}
