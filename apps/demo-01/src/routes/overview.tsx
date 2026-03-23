import { createFileRoute } from "@tanstack/react-router";

import { MetricCard, PageFrame, Panel, RouteLink, StatusPill } from "@/components/ui";
import { demoProjects, demoWorkspaces } from "@/lib/demo-data";
import { useSourceDemoState } from "@/lib/use-source-state";

export const Route = createFileRoute("/overview")({
  component: RouteComponent,
});

function RouteComponent() {
  const { ready, state } = useSourceDemoState();
  const workspace =
    demoWorkspaces.find((entry) => entry.id === state.workspaceId) ?? demoWorkspaces[0];
  const projects = demoProjects.filter((entry) => entry.workspaceId === workspace.id);
  const connection = state.connection;

  return (
    <PageFrame
      eyebrow="Project Operations Workspace"
      title="Project Hub starts the relationship, keeps the connection handle, and turns it into live incident context."
      intro="This demo is a project coordination application. It asks Falcon Connect to establish a directional link into Incident Ops, then uses the returned connection identifier to mint short-lived runtime tokens whenever a project owner needs live operational context."
      aside={
        <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
            Live workspace status
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-display text-2xl text-[var(--ink)]">{workspace.label}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{workspace.summary}</p>
            </div>
            <StatusPill tone={connection ? "good" : "warn"}>
              {ready && connection ? `Connected: ${connection.status}` : "Connection pending"}
            </StatusPill>
          </div>
        </div>
      }
    >
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Projects under watch"
          value={String(projects.length)}
          detail="Each project is mapped to runtime services in Incident Ops."
        />
        <MetricCard
          label="Primary service links"
          value={String(workspace.primaryServiceIds.length)}
          detail="These service IDs are passed directly to the target runtime APIs."
        />
        <MetricCard
          label="Runtime state"
          value={ready && connection ? "Live" : "Not yet linked"}
          detail="The source app becomes runtime-capable only after the callback stores a connectionId."
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Active projects"
          subtitle="These are normal product objects. Falcon Connect never owns them; it only standardizes the trust boundary around target-side calls."
        >
          <div className="grid gap-4">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--accent)]">
                      {project.tier}
                    </p>
                    <h3 className="mt-2 font-display text-2xl text-[var(--ink)]">{project.name}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                      {project.summary}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--muted)]">
                    Owner: <span className="text-[var(--ink)]">{project.owner}</span>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                      Service IDs sent to Incident Ops
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {project.serviceIds.map((serviceId) => (
                        <StatusPill key={serviceId} tone="neutral">
                          {serviceId}
                        </StatusPill>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                      Watch items
                    </p>
                    <ul className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                      {project.watchItems.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel
          title="Where to go next"
          subtitle="The route structure keeps the mental model and the implementation surface separate."
        >
          <div className="grid gap-3">
            <RouteLink
              to="/mental-model"
              title="Mental model"
              description="See the install-time and runtime responsibilities separated in product terms."
            />
            <RouteLink
              to="/connect-flow"
              title="Connect flow"
              description="Create an install intent, redirect into Incident Ops, and store the callback."
            />
            <RouteLink
              to="/runtime-calls"
              title="Runtime calls"
              description="Mint Falcon connection tokens and call the target app directly."
            />
            <RouteLink
              to="/sdk-internals"
              title="SDK internals"
              description="Inspect signed headers, derived JWKs, and verified JWT claims."
            />
          </div>
        </Panel>
      </div>
    </PageFrame>
  );
}
