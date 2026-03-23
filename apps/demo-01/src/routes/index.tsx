import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <section className="grid gap-6 border border-border/70 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22rem)] p-6">
        <pre className="overflow-x-auto font-mono text-[10px] leading-tight text-muted-foreground">
          DEMO APP 01 - SOURCE APP
        </pre>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
              FALCON CONNECT DEMO APP 01
            </p>
            <h1 className="max-w-3xl text-4xl font-medium tracking-tight">
              Demonstrates a FALCON Connect integration between a source app and a target app, as a
              source app
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              The source app is responsible for initiating the connection request and handling the
              callback after consent. This demo application is a minimal blueprint for a source app
              that wants to integrate with a target app. It uses only the FALCON Connect SDK - to
              act like a real application as closely as possible.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
