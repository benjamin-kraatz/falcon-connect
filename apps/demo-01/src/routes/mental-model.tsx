import { createFileRoute } from "@tanstack/react-router";

import { PageFrame, Panel, StatusPill } from "@/components/ui";

const installTimeline = [
  "Project Hub asks Falcon Connect to create an install intent for Incident Ops.",
  "Falcon returns a target connect URL with a signed install token.",
  "The user is redirected to Incident Ops, which authenticates the user locally and renders consent.",
  "Incident Ops sends Falcon either approval with granted scopes or denial with a reason.",
  "Falcon redirects back to Project Hub with the install outcome and an optional connectionId.",
] as const;

const runtimeTimeline = [
  "Project Hub keeps the returned connectionId with its own workspace record.",
  "Whenever a project owner needs live ops context, Project Hub asks Falcon for a short-lived connection token.",
  "Project Hub calls Incident Ops directly and attaches the token as a bearer credential.",
  "Incident Ops verifies the token locally and falls back to Falcon introspection when the demo forces that path.",
] as const;

export const Route = createFileRoute("/mental-model")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PageFrame
      eyebrow="Source App Mental Model"
      title="Install time creates trust. Runtime turns trust into direct application traffic."
      intro="The source app has two jobs that should never be collapsed into one bucket. During install, Project Hub is orchestrating a relationship. During runtime, it is a normal application using a short-lived Falcon token to call another app directly."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Install-time responsibilities"
          subtitle="The user is still in a guided connect flow. The output is a connection record, not target business data."
        >
          <div className="grid gap-4">
            {installTimeline.map((step, index) => (
              <div
                key={step}
                className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex items-start gap-4">
                  <span className="font-display text-4xl text-[var(--accent)]">0{index + 1}</span>
                  <p className="text-sm leading-7 text-[var(--muted)]">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Runtime responsibilities"
          subtitle="The connect flow is over. Project Hub is now just another application making direct calls into Incident Ops."
        >
          <div className="grid gap-4">
            {runtimeTimeline.map((step, index) => (
              <div
                key={step}
                className="rounded-[1.25rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex items-start gap-4">
                  <span className="font-display text-4xl text-[var(--accent)]">0{index + 1}</span>
                  <p className="text-sm leading-7 text-[var(--muted)]">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="What Falcon Connect does not do"
        subtitle="These boundaries are the point of the product. The demos call them out explicitly."
      >
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="bad">It does not host the target login</StatusPill>
          <StatusPill tone="bad">It does not proxy incident payloads</StatusPill>
          <StatusPill tone="bad">It does not replace application authorization</StatusPill>
          <StatusPill tone="good">
            It standardizes connection state and verification artifacts
          </StatusPill>
        </div>
      </Panel>
    </PageFrame>
  );
}
