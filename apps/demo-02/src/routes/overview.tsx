import { createFileRoute } from "@tanstack/react-router";

import { PageFrame, Panel, RouteLink, StatusPill } from "@/components/ui";
import { incidentCatalog, incidentResponders, onCallRoster, serviceHealth } from "@/lib/demo-data";
import { useTargetDemoState } from "@/lib/use-target-state";

export const Route = createFileRoute("/overview")({
  component: RouteComponent,
});

function RouteComponent() {
  const { ready, state } = useTargetDemoState();

  return (
    <PageFrame
      eyebrow="Incident Operations Control Surface"
      title="Incident Ops receives Falcon install requests, authenticates a local user, and defends direct runtime traffic."
      intro="This demo is the target application. It decides whether the user inside the target app may approve the relationship, exposes business endpoints to the source app, and verifies Falcon-issued runtime tokens locally before serving any data."
      aside={
        <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)]">
            Target-side auth
          </p>
          <div className="mt-3 space-y-3">
            <StatusPill tone={ready && state.session?.canApprove ? "good" : "warn"}>
              {state.session ? `${state.session.name} · ${state.session.role}` : "No local session"}
            </StatusPill>
            <p className="text-xs leading-5 text-[var(--muted)]">
              Falcon does not log your user in here. The target app still owns its own session and
              approval rules.
            </p>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="What this app exposes"
          subtitle="These are target-side business capabilities protected by Falcon verification."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <CapabilityCard
              label="Active incidents"
              value={String(incidentCatalog.length)}
              detail="Source apps can read incident summaries when `incidents:read` is granted."
            />
            <CapabilityCard
              label="Service health entries"
              value={String(serviceHealth.length)}
              detail="These service states power the release readiness view in the source app."
            />
            <CapabilityCard
              label="On-call rotations"
              value={String(onCallRoster.length)}
              detail="Roster visibility is optional because not every source app needs escalation contacts."
            />
            <CapabilityCard
              label="Approver roles"
              value={String(incidentResponders.filter((entry) => entry.canApprove).length)}
              detail="Only incident commanders can approve the incoming relationship."
            />
          </div>
        </Panel>

        <Panel
          title="Navigation"
          subtitle="The target routes follow the same teaching structure as the source app, but from the receiving side."
        >
          <div className="grid gap-2">
            <RouteLink
              to="/mental-model"
              title="Mental model"
              description="See the trust boundary between Falcon metadata and local target-side authorization."
            />
            <RouteLink
              to="/connect-flow"
              title="Connect flow"
              description="Resolve the install token, require a local session, and render consent."
            />
            <RouteLink
              to="/runtime-calls"
              title="Runtime calls"
              description="Inspect verification results and test the direct target endpoints."
            />
            <RouteLink
              to="/sdk-internals"
              title="SDK internals"
              description="Inspect consent helpers, signed headers, and target-side verification helpers."
            />
          </div>
        </Panel>
      </div>
    </PageFrame>
  );
}

function CapabilityCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
    </div>
  );
}
