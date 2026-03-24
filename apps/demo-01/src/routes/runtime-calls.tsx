import { createFileRoute } from "@tanstack/react-router";
import { startTransition, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, JsonCard, PageFrame, Panel, StatusPill } from "@/components/ui";
import { demoProjects, demoWorkspaces } from "@/lib/demo-data";
import { formatDateTime, formatJson, tokenPreview } from "@/lib/format";
import {
  persistApprovedSourceConnection,
  readSourceDemoState,
  type SourceRuntimeCall,
} from "@/lib/storage";
import { useSourceDemoState } from "@/lib/use-source-state";
import { issueConnectionTokenAction, recoverConnectionAction } from "@/functions/source-actions";

type RuntimePayload = {
  verification: unknown;
  data: unknown;
  message?: string;
};

export const Route = createFileRoute("/runtime-calls")({
  component: RouteComponent,
});

function RouteComponent() {
  const { ready, state, updateState } = useSourceDemoState();
  const [projectId, setProjectId] = useState("proj-rollout");
  const [verificationMode, setVerificationMode] = useState<"local" | "force-introspection">(
    "local",
  );
  const [busyEndpoint, setBusyEndpoint] = useState<string | null>(null);
  const [latestPayload, setLatestPayload] = useState<RuntimePayload | null>(null);
  const project = useMemo(
    () => demoProjects.find((entry) => entry.id === projectId) ?? demoProjects[0],
    [projectId],
  );
  const workspace = useMemo(
    () => demoWorkspaces.find((entry) => entry.id === project.workspaceId) ?? demoWorkspaces[0],
    [project.workspaceId],
  );
  const activeConnection = state.connection ?? readSourceDemoState().connection;

  useEffect(() => {
    if (!ready || activeConnection) {
      return;
    }

    void (async () => {
      try {
        const recovered = await recoverConnectionAction({
          data: {
            falconSubjectId: workspace.falconSubjectId,
            organizationId: workspace.organizationId,
          },
        });

        if (!recovered || recovered.status !== "active") {
          return;
        }

        updateState((current) =>
          persistApprovedSourceConnection({
            connectionId: recovered.id,
            intentId: current.connection?.intentId ?? current.latestIntent?.intentId ?? "recovered",
            grantedScopes: recovered.grantedScopes
              .filter((scope) => scope.selected)
              .map((scope) => scope.name),
            callbackUrl: current.connection?.callbackUrl ?? "recovered-from-falcon",
          }),
        );
      } catch {
        // Runtime recovery is best-effort. Keep the existing local-state path silent.
      }
    })();
  }, [activeConnection, ready, updateState, workspace.falconSubjectId, workspace.organizationId]);

  const mintToken = async () => {
    let connectionId =
      activeConnection?.connectionId ?? readSourceDemoState().connection?.connectionId;

    if (!connectionId) {
      const recovered = await recoverConnectionAction({
        data: {
          falconSubjectId: workspace.falconSubjectId,
          organizationId: workspace.organizationId,
        },
      });

      if (recovered?.status === "active") {
        updateState((current) =>
          persistApprovedSourceConnection({
            connectionId: recovered.id,
            intentId: current.connection?.intentId ?? current.latestIntent?.intentId ?? "recovered",
            grantedScopes: recovered.grantedScopes
              .filter((scope) => scope.selected)
              .map((scope) => scope.name),
            callbackUrl: current.connection?.callbackUrl ?? "recovered-from-falcon",
          }),
        );
        connectionId = recovered.id;
      }
    }

    if (!connectionId) {
      toast.error("Approve the install flow before minting a runtime token.");
      return null;
    }

    const tokenResult = await issueConnectionTokenAction({
      data: {
        connectionId,
      },
    });

    updateState((current) => ({
      ...current,
      latestToken: tokenResult,
      latestTokenPreview: tokenPreview(tokenResult.token),
    }));

    return tokenResult;
  };

  const callEndpoint = async (endpoint: "incidents" | "service-health" | "roster" | "runbooks") => {
    if (!ready) {
      return;
    }

    setBusyEndpoint(endpoint);

    try {
      const tokenResult = await mintToken();

      if (!tokenResult) {
        return;
      }

      const response = await fetch(`http://localhost:4102/api/runtime/${endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${tokenResult.token}`,
          "x-demo-verification-mode": verificationMode,
        },
        body: JSON.stringify({
          projectId: project.id,
          serviceIds: project.serviceIds,
        }),
      });

      const payload = (await response.json()) as RuntimePayload;

      if (!response.ok) {
        throw new Error(payload.message ?? `Runtime request failed with ${response.status}`);
      }

      setLatestPayload(payload);
      toast.success(`Loaded ${endpoint.replace("-", " ")}`);

      const entry: SourceRuntimeCall = {
        id: crypto.randomUUID(),
        endpoint,
        mode: verificationMode,
        requestedAt: new Date().toISOString(),
        outcome: "ok",
        note: `Verification mode ${verificationMode}`,
      };

      startTransition(() => {
        updateState((current) => ({
          ...current,
          runtimeCalls: [entry, ...current.runtimeCalls].slice(0, 8),
        }));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Runtime call failed";
      toast.error(message);
      const entry: SourceRuntimeCall = {
        id: crypto.randomUUID(),
        endpoint,
        mode: verificationMode,
        requestedAt: new Date().toISOString(),
        outcome: "error",
        note: message,
      };
      updateState((current) => ({
        ...current,
        runtimeCalls: [entry, ...current.runtimeCalls].slice(0, 8),
      }));
    } finally {
      setBusyEndpoint(null);
    }
  };

  return (
    <PageFrame
      eyebrow="Runtime Calls"
      title="Project Hub mints a short-lived Falcon token and calls Incident Ops directly."
      intro="These requests are normal application traffic. The source app chooses the business payload. The only Falcon-specific part is the runtime token it fetches just in time from the control plane."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel
          title="Runtime request console"
          subtitle="Pick a project, mint a fresh token, and call a target endpoint with either local verification or forced introspection."
        >
          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                Project
              </span>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="rounded-[1rem] border border-white/10 bg-[var(--panel-strong)] px-4 py-3 text-[var(--ink)]"
              >
                {demoProjects.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2">
              <span className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                Verification mode
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={verificationMode === "local" ? "primary" : "secondary"}
                  onClick={() => setVerificationMode("local")}
                >
                  Local verify
                </Button>
                <Button
                  variant={verificationMode === "force-introspection" ? "primary" : "secondary"}
                  onClick={() => setVerificationMode("force-introspection")}
                >
                  Force introspection
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => void callEndpoint("incidents")}
                disabled={busyEndpoint !== null}
              >
                {busyEndpoint === "incidents" ? "Loading" : "Fetch incidents"}
              </Button>
              <Button
                onClick={() => void callEndpoint("service-health")}
                disabled={busyEndpoint !== null}
              >
                {busyEndpoint === "service-health" ? "Loading" : "Fetch service health"}
              </Button>
              <Button onClick={() => void callEndpoint("roster")} disabled={busyEndpoint !== null}>
                {busyEndpoint === "roster" ? "Loading" : "Fetch on-call roster"}
              </Button>
              <Button
                onClick={() => void callEndpoint("runbooks")}
                disabled={busyEndpoint !== null}
              >
                {busyEndpoint === "runbooks" ? "Loading" : "Fetch runbooks"}
              </Button>
            </div>

            <div className="rounded-[1.25rem] border border-white/10 bg-[var(--panel-strong)] p-4 text-sm leading-7 text-[var(--muted)]">
              <p>
                Current project: <span className="text-[var(--ink)]">{project.name}</span>
              </p>
              <p>
                Linked services:{" "}
                <span className="text-[var(--ink)]">{project.serviceIds.join(", ")}</span>
              </p>
              <p>
                Stored connection:{" "}
                <span className="text-[var(--ink)]">
                  {activeConnection?.connectionId ?? "No approved callback yet"}
                </span>
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Latest runtime state"
          subtitle="The source app keeps the freshest Falcon token and the last direct response payload to make debugging obvious."
        >
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Snapshot
                label="Connection status"
                value={activeConnection?.status ?? "not connected"}
              />
              <Snapshot
                label="Token expiry"
                value={
                  state.latestToken ? formatDateTime(state.latestToken.expiresAt) : "No token yet"
                }
              />
              <Snapshot label="Token preview" value={state.latestTokenPreview ?? "Not minted"} />
              <Snapshot label="Last verification mode" value={verificationMode} />
            </div>

            {state.latestToken ? (
              <JsonCard label="IssueConnectionTokenResult" value={formatJson(state.latestToken)} />
            ) : null}
            {latestPayload ? (
              <JsonCard label="Last target response" value={formatJson(latestPayload)} />
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
                No target request has completed yet.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Runtime request history"
        subtitle="This history is source-local state. Falcon does not persist your UI history for you."
      >
        <div className="grid gap-3">
          {state.runtimeCalls.length ? (
            state.runtimeCalls.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone={entry.outcome === "ok" ? "good" : "bad"}>
                      {entry.outcome}
                    </StatusPill>
                    <span className="font-mono text-sm text-[var(--ink)]">{entry.endpoint}</span>
                    <span className="text-sm text-[var(--muted)]">{entry.mode}</span>
                  </div>
                  <span className="text-sm text-[var(--muted)]">
                    {formatDateTime(entry.requestedAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{entry.note}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
              No runtime calls yet.
            </div>
          )}
        </div>
      </Panel>
    </PageFrame>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-[var(--panel-strong)] p-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 break-all text-sm text-[var(--ink)]">{value}</p>
    </div>
  );
}
