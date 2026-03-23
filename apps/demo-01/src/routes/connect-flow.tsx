import { createFileRoute } from "@tanstack/react-router";
import { startTransition, useState } from "react";
import { toast } from "sonner";

import { Button, JsonCard, PageFrame, Panel, StatusPill } from "@/components/ui";
import { sourceDemoConfig } from "@/lib/config";
import { demoWorkspaces, scopeNarrative } from "@/lib/demo-data";
import { formatDateTime, formatJson } from "@/lib/format";
import { useSourceDemoState } from "@/lib/use-source-state";
import { createInstallIntentAction } from "@/functions/source-actions";

export const Route = createFileRoute("/connect-flow")({
  component: RouteComponent,
});

function RouteComponent() {
  const { ready, state, updateState } = useSourceDemoState();
  const workspace =
    demoWorkspaces.find((entry) => entry.id === state.workspaceId) ?? demoWorkspaces[0];
  const [busy, setBusy] = useState(false);

  const startInstall = async () => {
    setBusy(true);

    try {
      const result = await createInstallIntentAction({
        data: {
          falconSubjectId: workspace.falconSubjectId,
          organizationId: workspace.organizationId,
          requestedScopes: [...sourceDemoConfig.defaultScopes],
        },
      });

      updateState((current) => ({
        ...current,
        latestIntent: result,
      }));
      toast.success("Install intent created. Redirecting to Incident Ops.");

      startTransition(() => {
        window.location.href = result.connectUrl;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create install intent";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageFrame
      eyebrow="Connect Flow"
      title="Project Hub creates a signed install intent and hands the rest of the user journey to Incident Ops."
      intro="This page demonstrates the source-side implementation boundary. Project Hub decides the target app, the workspace identity, and the requested scopes. Falcon Connect returns a signed connect URL. The target app owns everything the user sees after that redirect."
      aside={
        <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
            Current workspace
          </p>
          <h3 className="mt-3 font-display text-3xl text-[var(--ink)]">{workspace.label}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{workspace.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill tone="neutral">{workspace.falconSubjectId}</StatusPill>
            <StatusPill tone="neutral">{workspace.organizationId}</StatusPill>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Panel
          title="Requested scopes"
          subtitle="The source app asks for the target capabilities it wants to use later at runtime. Falcon will automatically add any system scopes the target declared."
          actions={
            <Button onClick={() => void startInstall()} disabled={busy || !ready}>
              {busy ? "Creating intent" : "Connect Incident Ops"}
            </Button>
          }
        >
          <div className="grid gap-3">
            {scopeNarrative.map((scope) => (
              <div
                key={scope.name}
                className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill tone={scope.category === "Optional" ? "warn" : "good"}>
                    {scope.category}
                  </StatusPill>
                  <span className="font-mono text-sm text-[var(--ink)]">{scope.name}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{scope.why}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Latest install intent"
          subtitle="This is the source-side artifact Falcon returns before the user ever sees the target app."
        >
          {state.latestIntent ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Intent ID" value={state.latestIntent.intentId} />
                <Metric label="Expires" value={formatDateTime(state.latestIntent.expiresAt)} />
                <Metric label="Target" value={state.latestIntent.targetAppId} />
                <Metric
                  label="Requested scopes"
                  value={String(state.latestIntent.requestedScopes.length)}
                />
              </div>
              <JsonCard label="CreateInstallIntentResult" value={formatJson(state.latestIntent)} />
            </div>
          ) : (
            <EmptyState message="No install intent has been created yet. Use the action on the left to launch the target-side connect flow." />
          )}
        </Panel>
      </div>
    </PageFrame>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-[var(--panel-strong)] p-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 break-all text-sm text-[var(--ink)]">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
      {message}
    </div>
  );
}
