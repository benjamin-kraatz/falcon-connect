import { createFileRoute } from "@tanstack/react-router";
import { startTransition, useState } from "react";
import { toast } from "sonner";

import { Button, JsonCard, PageFrame, Panel, StatusPill } from "@/components/ui";
import { formatDateTime, formatJson } from "@/lib/format";
import { useTargetDemoState } from "@/lib/use-target-state";

export const Route = createFileRoute("/runtime-calls")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const { state, updateState } = useTargetDemoState();
  const [token, setToken] = useState(search.token || state.latestVerificationToken || "");
  const [mode, setMode] = useState<"local" | "force-introspection">("local");
  const [payload, setPayload] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const runVerification = async () => {
    if (!token) {
      toast.error("Paste a Falcon connection token from Project Hub first.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/runtime/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-demo-verification-mode": mode,
        },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Verification failed");
      }

      setPayload(result);
      toast.success("Verification complete");
      startTransition(() => {
        const entry = {
          id: crypto.randomUUID(),
          mode,
          outcome: "ok" as const,
          message: "Verified runtime request",
          createdAt: new Date().toISOString(),
        };
        updateState((current) => ({
          ...current,
          latestVerificationToken: token,
          verificationHistory: [entry, ...current.verificationHistory].slice(0, 10),
        }));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed";
      toast.error(message);
      const entry = {
        id: crypto.randomUUID(),
        mode,
        outcome: "error" as const,
        message,
        createdAt: new Date().toISOString(),
      };
      updateState((current) => ({
        ...current,
        latestVerificationToken: token,
        verificationHistory: [entry, ...current.verificationHistory].slice(0, 10),
      }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame
      eyebrow="Runtime Verification"
      title="Incident Ops verifies bearer tokens before any direct data leaves the target app."
      intro="Paste a Falcon connection token from Project Hub, then verify it either through the local JWT path or the forced introspection path. The same verification helper also protects the runtime API endpoints used by the source app."
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title="Verification console"
          subtitle="This is the target-side diagnostic surface for runtime traffic."
          actions={
            <Button onClick={() => void runVerification()} disabled={busy}>
              {busy ? "Verifying" : "Verify token"}
            </Button>
          }
        >
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                Token
              </span>
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="min-h-36 rounded-[1rem] border border-white/10 bg-[var(--panel-strong)] px-4 py-3 text-[var(--ink)]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={mode === "local" ? "primary" : "secondary"}
                onClick={() => setMode("local")}
              >
                Local verify
              </Button>
              <Button
                variant={mode === "force-introspection" ? "primary" : "secondary"}
                onClick={() => setMode("force-introspection")}
              >
                Force introspection
              </Button>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-[var(--panel-strong)] p-4 text-sm leading-7 text-[var(--muted)]">
              <p>
                Expected endpoint scopes: incidents, services, roster, and runbooks each enforce
                their own required scope.
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Latest verification payload"
          subtitle="The target app exposes mode, active state, claims, and connection status clearly."
        >
          {payload ? (
            <JsonCard label="Verification result" value={formatJson(payload)} />
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
              No verification request has been executed yet.
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Verification history"
        subtitle="This is target-local UI state showing how the last few verification attempts behaved."
      >
        <div className="grid gap-3">
          {state.verificationHistory.length ? (
            state.verificationHistory.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone={entry.outcome === "ok" ? "good" : "bad"}>
                      {entry.outcome}
                    </StatusPill>
                    <span className="font-mono text-sm text-[var(--ink)]">{entry.mode}</span>
                  </div>
                  <span className="text-sm text-[var(--muted)]">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{entry.message}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
              No verification history yet.
            </div>
          )}
        </div>
      </Panel>
    </PageFrame>
  );
}
