import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button, PageFrame, Panel, StatusPill } from "@/components/ui";
import { incidentResponders } from "@/lib/demo-data";
import { useTargetDemoState } from "@/lib/use-target-state";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/overview",
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { updateState } = useTargetDemoState();

  return (
    <PageFrame
      eyebrow="Local Target Auth"
      title="Choose a local Incident Ops user before attempting consent."
      intro="This demo intentionally makes local login visible so the trust boundary is obvious. Falcon delivered the request, but it did not create a target-side session."
    >
      <Panel
        title="Demo responders"
        subtitle="Only the incident commander can approve the incoming relationship."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {incidentResponders.map((responder) => (
            <article
              key={responder.id}
              className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill tone={responder.canApprove ? "good" : "warn"}>
                  {responder.canApprove ? "Can approve" : "Read-only"}
                </StatusPill>
                <span className="text-sm uppercase tracking-[0.28em] text-[var(--muted)]">
                  {responder.role}
                </span>
              </div>
              <h3 className="mt-4 font-display text-3xl text-[var(--ink)]">{responder.name}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {responder.canApprove
                  ? "Use this role to complete the consent flow."
                  : "This user can inspect the request but is not authorized to approve it."}
              </p>
              <div className="mt-5">
                <Button
                  onClick={() => {
                    updateState((current) => ({ ...current, session: responder }));
                    window.location.href = search.redirect;
                  }}
                >
                  Sign in as {responder.name}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => void navigate({ to: "/overview" })}>
          Back to overview
        </Button>
      </div>
    </PageFrame>
  );
}
