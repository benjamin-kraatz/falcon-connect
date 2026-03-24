import { createFileRoute } from "@tanstack/react-router";

import { PageFrame, Panel, StatusPill } from "@/components/ui";

export const Route = createFileRoute("/mental-model")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PageFrame
      eyebrow="Target App Mental Model"
      title="The target app trusts Falcon for connection state, but it never delegates local user authorization."
      intro="The target side needs two different decision engines. First, local auth and policy determine whether the current user is allowed to approve the relationship. Second, Falcon verification determines whether a direct runtime request is attached to an active connection."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Install-time duties"
          subtitle="This is where the target app protects its own approval boundary."
        >
          <ul className="grid gap-3 text-sm leading-7 text-[var(--muted)]">
            <li>• Receive the signed `falcon_connect_intent` query parameter.</li>
            <li>• Require a local user session before any approval happens.</li>
            <li>• Resolve the install intent with Falcon and render the exact scope surface.</li>
            <li>• Approve or deny by calling Falcon back with the final decision.</li>
          </ul>
        </Panel>

        <Panel
          title="Runtime duties"
          subtitle="This is where the target app protects its business endpoints."
        >
          <ul className="grid gap-3 text-sm leading-7 text-[var(--muted)]">
            <li>• Read the Falcon bearer token on direct requests from the source app.</li>
            <li>• Verify the JWT locally against Falcon JWKS for the fast path.</li>
            <li>• Fall back to Falcon introspection when the demo forces that path.</li>
            <li>• Enforce scope-based authorization before returning incident data.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Trust boundaries" subtitle="These lines stay intentionally sharp in the demo.">
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="good">Falcon tells you what relationship exists</StatusPill>
          <StatusPill tone="good">Your app decides who may approve it</StatusPill>
          <StatusPill tone="bad">Falcon does not own the target user session</StatusPill>
          <StatusPill tone="bad">Falcon does not replace your endpoint authz checks</StatusPill>
        </div>
      </Panel>
    </PageFrame>
  );
}
