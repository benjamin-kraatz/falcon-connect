import { buildConsentSelection, normalizeGrantedScopes } from "@falcon/sdk/effect";
import { createFileRoute } from "@tanstack/react-router";
import { startTransition, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, JsonCard, PageFrame, Panel, StatusPill } from "@/components/ui";
import { formatDateTime, formatJson } from "@/lib/format";
import { useTargetDemoState } from "@/lib/use-target-state";
import {
  approveInstallIntentAction,
  denyInstallIntentAction,
  resolveInstallIntentAction,
} from "@/functions/target-actions";

export const Route = createFileRoute("/connect-flow")({
  validateSearch: (search: Record<string, unknown>) => ({
    falcon_connect_intent:
      typeof search.falcon_connect_intent === "string" ? search.falcon_connect_intent : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const { ready, state, updateState } = useTargetDemoState();
  const [busy, setBusy] = useState<"resolve" | "approve" | "deny" | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [deniedReason, setDeniedReason] = useState("Approval denied by Incident Ops");

  useEffect(() => {
    if (!search.falcon_connect_intent || !ready) {
      return;
    }

    if (state.latestIntentToken === search.falcon_connect_intent && state.latestResolvedIntent) {
      return;
    }

    const intentToken = search.falcon_connect_intent;

    void (async () => {
      setBusy("resolve");
      try {
        const resolvedIntent = await resolveInstallIntentAction({
          data: {
            intentToken,
          },
        });
        updateState((current) => ({
          ...current,
          latestIntentToken: intentToken,
          latestResolvedIntent: resolvedIntent,
        }));
        setSelectedScopes(
          buildConsentSelection(resolvedIntent)
            .filter((scope) => scope.selected)
            .map((scope) => scope.name),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to resolve install intent";
        toast.error(message);
      } finally {
        setBusy(null);
      }
    })();
  }, [
    ready,
    search.falcon_connect_intent,
    state.latestIntentToken,
    state.latestResolvedIntent,
    updateState,
  ]);

  const intent = state.latestResolvedIntent;
  const consentScopes = useMemo(
    () => (intent ? buildConsentSelection(intent, selectedScopes) : []),
    [intent, selectedScopes],
  );
  const grantedScopesPreview = intent ? normalizeGrantedScopes(intent, selectedScopes) : [];

  const approve = async () => {
    if (!search.falcon_connect_intent || !intent) {
      return;
    }

    setBusy("approve");

    try {
      const decision = await approveInstallIntentAction({
        data: {
          intentToken: search.falcon_connect_intent,
          selectedScopeNames: selectedScopes,
        },
      });
      updateState((current) => ({
        ...current,
        lastDecision: decision,
      }));
      toast.success("Consent approved. Redirecting to Project Hub.");
      startTransition(() => {
        window.location.href = decision.redirectUrl;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to approve install intent";
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const deny = async () => {
    if (!search.falcon_connect_intent) {
      return;
    }

    setBusy("deny");

    try {
      const decision = await denyInstallIntentAction({
        data: {
          intentToken: search.falcon_connect_intent,
          deniedReason,
        },
      });
      updateState((current) => ({
        ...current,
        lastDecision: decision,
      }));
      toast.success("Consent denied. Redirecting to Project Hub.");
      startTransition(() => {
        window.location.href = decision.redirectUrl;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to deny install intent";
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageFrame
      eyebrow="Connect Flow"
      title="Incident Ops resolves the signed install token, requires a local approver, and submits the final consent decision."
      intro="This page is the entire target-side install surface. It demonstrates that the target app owns authentication, authorization, consent UX, and the final call back to Falcon Connect."
    >
      {!search.falcon_connect_intent ? (
        <Panel
          title="Waiting for a Falcon install request"
          subtitle="Start the flow from Project Hub. Falcon will append `falcon_connect_intent` to this route."
        >
          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
            No install token is present yet. The normal path is: Project Hub creates an install
            intent, Falcon returns the connect URL, and the browser lands here with a signed token.
          </div>
        </Panel>
      ) : null}

      {search.falcon_connect_intent ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel
            title="Consent workspace"
            subtitle="This left column mirrors the target-side operator experience."
            actions={
              !state.session ? (
                <Button
                  onClick={() =>
                    (window.location.href = `/login?redirect=${encodeURIComponent(window.location.href)}`)
                  }
                >
                  Sign in locally
                </Button>
              ) : null
            }
          >
            {!state.session ? (
              <AuthGate />
            ) : !state.session.canApprove ? (
              <RoleGate name={state.session.name} />
            ) : intent ? (
              <div className="grid gap-4">
                <div className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone="good">{state.session.name}</StatusPill>
                    <StatusPill tone="neutral">{state.session.role}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {intent.sourceApp.displayName} wants to connect to Incident Ops for subject{" "}
                    <span className="font-mono text-[var(--ink)]">{intent.falconSubjectId}</span> in{" "}
                    <span className="font-mono text-[var(--ink)]">{intent.organizationId}</span>.
                  </p>
                </div>

                <div className="grid gap-3">
                  {consentScopes.map((scope) => (
                    <label
                      key={scope.name}
                      className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
                    >
                      <input
                        type="checkbox"
                        checked={scope.selected}
                        disabled={scope.locked}
                        onChange={(event) => {
                          setSelectedScopes((current) =>
                            event.target.checked
                              ? [...new Set([...current, scope.name])]
                              : current.filter((entry) => entry !== scope.name),
                          );
                        }}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm text-[var(--ink)]">{scope.name}</span>
                          {scope.system ? <StatusPill tone="good">system</StatusPill> : null}
                          {scope.required ? <StatusPill tone="warn">required</StatusPill> : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          {scope.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                      Denial reason
                    </span>
                    <textarea
                      value={deniedReason}
                      onChange={(event) => setDeniedReason(event.target.value)}
                      className="min-h-24 rounded-[1rem] border border-white/10 bg-[var(--panel-strong)] px-4 py-3 text-[var(--ink)]"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void approve()} disabled={busy !== null}>
                    {busy === "approve" ? "Approving" : "Approve install"}
                  </Button>
                  <Button variant="danger" onClick={() => void deny()} disabled={busy !== null}>
                    {busy === "deny" ? "Denying" : "Deny install"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
                Resolving install intent…
              </div>
            )}
          </Panel>

          <Panel
            title="Resolved install intent"
            subtitle="The target app consumes Falcon metadata and turns it into a real consent surface."
          >
            {intent ? (
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Snapshot label="Source app" value={intent.sourceApp.displayName} />
                  <Snapshot label="Expires" value={formatDateTime(intent.expiresAt)} />
                  <Snapshot label="Subject" value={intent.falconSubjectId} />
                  <Snapshot label="Organization" value={intent.organizationId} />
                </div>
                <JsonCard label="ResolvedInstallIntent" value={formatJson(intent)} />
                <JsonCard
                  label="normalizeGrantedScopes(intent, selection)"
                  value={formatJson(grantedScopesPreview)}
                />
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
                Resolve an incoming intent to populate this panel.
              </div>
            )}
          </Panel>
        </div>
      ) : null}
    </PageFrame>
  );
}

function AuthGate() {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--muted)]">
      Incident Ops has a Falcon request, but no target-side session. That is expected. Sign in as a
      local user before deciding whether the relationship should be approved.
    </div>
  );
}

function RoleGate({ name }: { name: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-[rgba(255,133,120,0.28)] bg-[rgba(255,133,120,0.08)] p-5 text-sm leading-7 text-[var(--muted)]">
      {name} is signed in, but this role cannot approve install intents. Switch to an incident
      commander to continue.
    </div>
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
