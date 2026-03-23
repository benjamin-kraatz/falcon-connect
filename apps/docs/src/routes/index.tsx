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
            Build directional app integrations on top of FALCON Connect
          </h1>
          <p className="text-base text-fd-muted-foreground">
            These docs explain trusted app registration, signed install intents, target-app consent,
            Falcon-issued runtime verification tokens, and fallback introspection.
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
