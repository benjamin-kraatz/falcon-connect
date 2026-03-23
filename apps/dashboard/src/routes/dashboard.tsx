import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { startTransition, useState } from "react";

import { Button } from "@falcon/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@falcon/ui/components/card";

import { getUser } from "@/functions/get-user";
import { client, orpc, queryClient } from "@/utils/orpc";

type OpsOverview = {
  trustedAppCount: number;
  activeConnectionCount: number;
  pendingInstallIntentCount: number;
  pausedConnectionCount: number;
};

type TrustedAppItem = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  connectRequestUrl: string;
  dataApiBaseUrl: string;
  scopes: Array<{ name: string }>;
};

type ConnectionItem = {
  id: string;
  sourceAppName: string;
  targetAppName: string;
  organizationId: string;
  falconSubjectId: string;
  status: "active" | "paused" | "revoked" | "pending" | "denied";
  updatedAt: string;
  grantedScopes: Array<{ name: string; selected: boolean }>;
};

type InstallIntentItem = {
  id: string;
  sourceAppName: string;
  targetAppName: string;
  requestedScopes: string[];
  status: string;
  expiresAt: string;
};

type AuditEventItem = {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: string) {
  switch (status) {
    case "active":
    case "approved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "paused":
      return "border-orange-500/30 bg-orange-500/10 text-orange-200";
    case "revoked":
    case "denied":
    case "expired":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex min-w-20 justify-center border px-2 py-1 text-[11px] uppercase tracking-[0.24em] ${statusTone(status)}`}
    >
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [busyConnectionId, setBusyConnectionId] = useState<string | null>(null);

  const overview = useQuery<OpsOverview>((orpc as any).ops.overview.queryOptions());
  const trustedApps = useQuery<TrustedAppItem[]>((orpc as any).ops.trustedApps.queryOptions());
  const connections = useQuery<ConnectionItem[]>((orpc as any).ops.connections.queryOptions());
  const installIntents = useQuery<InstallIntentItem[]>(
    (orpc as any).ops.installIntents.queryOptions(),
  );
  const auditEvents = useQuery<AuditEventItem[]>((orpc as any).ops.auditEvents.queryOptions());

  const runConnectionAction = async (
    connectionId: string,
    status: "active" | "paused" | "revoked",
    reason?: string,
  ) => {
    setBusyConnectionId(connectionId);

    try {
      await (client as any).ops.updateConnectionStatus({
        connectionId,
        status,
        reason,
      });
      toast.success(`Connection ${status}`);
      startTransition(() => {
        void queryClient.invalidateQueries();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update connection";
      toast.error(message);
    } finally {
      setBusyConnectionId(null);
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_right,_rgba(72,187,120,0.18),_transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24rem)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <section className="grid gap-4 border border-border/70 bg-card/60 p-4 backdrop-blur">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
                Falcon Connect Operations
              </p>
              <h1 className="text-2xl font-medium tracking-tight">
                Internal registry, consent, and verification control plane
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Signed app onboarding is still private in v1. This console is for Falcon staff to
                inspect trusted apps, directional connections, install intents, and runtime
                verification history.
              </p>
            </div>
            <div className="border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              Signed in as <span className="text-foreground">{session?.user.email}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Trusted Apps"
            value={overview.data?.trustedAppCount}
            loading={overview.isLoading}
          />
          <MetricCard
            label="Active Connections"
            value={overview.data?.activeConnectionCount}
            loading={overview.isLoading}
          />
          <MetricCard
            label="Pending Intents"
            value={overview.data?.pendingInstallIntentCount}
            loading={overview.isLoading}
          />
          <MetricCard
            label="Paused Connections"
            value={overview.data?.pausedConnectionCount}
            loading={overview.isLoading}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Directional Connections</CardTitle>
              <CardDescription>
                Source-to-target relationships that can mint Falcon-signed runtime access tokens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!connections.data?.length ? (
                <EmptyState message="No directional connections have been approved yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="px-0 py-2">Direction</th>
                        <th className="px-0 py-2">Status</th>
                        <th className="px-0 py-2">Scopes</th>
                        <th className="px-0 py-2">Updated</th>
                        <th className="px-0 py-2 text-right">Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {connections.data.map((item) => {
                        const activeScopes = item.grantedScopes
                          .filter((scope) => scope.selected)
                          .map((scope) => scope.name)
                          .join(", ");
                        const isBusy = busyConnectionId === item.id;

                        return (
                          <tr key={item.id} className="border-b border-border/50 align-top">
                            <td className="py-3 pr-6">
                              <div className="font-medium">
                                {item.sourceAppName} to {item.targetAppName}
                              </div>
                              <div className="mt-1 text-muted-foreground">
                                {item.organizationId} · {item.falconSubjectId}
                              </div>
                            </td>
                            <td className="py-3 pr-6">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="py-3 pr-6 text-muted-foreground">
                              {activeScopes || "No granted scopes"}
                            </td>
                            <td className="py-3 pr-6 text-muted-foreground">
                              {formatDateTime(item.updatedAt)}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                {item.status !== "active" ? (
                                  <Button
                                    size="xs"
                                    variant="secondary"
                                    disabled={isBusy}
                                    onClick={() => runConnectionAction(item.id, "active")}
                                  >
                                    Reactivate
                                  </Button>
                                ) : (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() =>
                                      runConnectionAction(
                                        item.id,
                                        "paused",
                                        "Paused from ops console",
                                      )
                                    }
                                  >
                                    Pause
                                  </Button>
                                )}
                                {item.status !== "revoked" ? (
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    disabled={isBusy}
                                    onClick={() =>
                                      runConnectionAction(
                                        item.id,
                                        "revoked",
                                        "Revoked from ops console",
                                      )
                                    }
                                  >
                                    Revoke
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trusted Apps</CardTitle>
              <CardDescription>
                Staff-managed partner app manifests, keys, callbacks, and declared scopes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!trustedApps.data?.length ? (
                <EmptyState message="No trusted apps are registered in the database yet." />
              ) : (
                trustedApps.data.map((app) => (
                  <div key={app.id} className="border border-border/70 bg-background/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{app.displayName}</div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                          {app.slug}
                        </div>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                      <span>{app.dataApiBaseUrl}</span>
                      <span>{app.connectRequestUrl}</span>
                      <span>{app.scopes.length} declared scopes</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent Install Intents</CardTitle>
              <CardDescription>
                Pending or recently decided install attempts before they turn into directional
                connections.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!installIntents.data?.length ? (
                <EmptyState message="No install intents have been created yet." />
              ) : (
                installIntents.data.map((intent) => (
                  <div key={intent.id} className="border border-border/70 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {intent.sourceAppName} to {intent.targetAppName}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {intent.requestedScopes.join(", ") || "No requested scopes"}
                        </div>
                      </div>
                      <StatusBadge status={intent.status} />
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Expires {formatDateTime(intent.expiresAt)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification Audit Trail</CardTitle>
              <CardDescription>
                Lifecycle and runtime verification events emitted by the Falcon Connect control
                plane.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!auditEvents.data?.length ? (
                <EmptyState message="No audit events have been recorded yet." />
              ) : (
                auditEvents.data.map((event) => (
                  <div key={event.id} className="border border-border/70 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{event.eventType}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {event.actorType}
                          {event.actorId ? ` · ${event.actorId}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </div>
                    </div>
                    <pre className="mt-3 overflow-x-auto border border-border/70 bg-background/60 p-2 text-[11px] text-muted-foreground">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{loading ? "..." : (value ?? 0)}</CardTitle>
      </CardHeader>
    </Card>
  );
}
