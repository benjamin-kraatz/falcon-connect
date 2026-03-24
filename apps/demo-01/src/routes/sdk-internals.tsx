import { createFileRoute } from "@tanstack/react-router";
import { Effect, Schema } from "effect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreateInstallIntentInput, UpdateConnectionStatusInput } from "@falcon/sdk/effect";

import { JsonCard, PageFrame, Panel, StatusPill } from "@/components/ui";
import { sourceDemoConfig } from "@/lib/config";
import { formatJson } from "@/lib/format";
import type { SourceSdkDiagnostics } from "@/lib/source-server";
import { useSourceDemoState } from "@/lib/use-source-state";
import { buildSourceSdkDiagnosticsAction } from "@/functions/source-actions";

export const Route = createFileRoute("/sdk-internals")({
  component: RouteComponent,
});

function RouteComponent() {
  const { state } = useSourceDemoState();
  const [diagnostics, setDiagnostics] = useState<SourceSdkDiagnostics | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const result = await buildSourceSdkDiagnosticsAction({
          data: {
            connectionId: state.connection?.connectionId ?? null,
            latestIntentToken: state.latestIntent?.intentToken ?? null,
            latestToken: state.latestToken?.token ?? null,
          },
        });
        setDiagnostics(result as SourceSdkDiagnostics);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to build diagnostics";
        toast.error(message);
      }
    })();
  }, [state.connection?.connectionId, state.latestIntent?.intentToken, state.latestToken?.token]);

  const protocolCatalog = {
    falconSystemScopes: ["read:app-info"] as const,
    trustedAppStatus: ["active", "inactive"] as const,
    connectionStatus: ["pending", "active", "paused", "revoked", "denied"] as const,
    validatedCreateInstallIntent: Effect.runSync(
      Schema.decodeUnknown(CreateInstallIntentInput)({
        targetAppId: sourceDemoConfig.targetAppId,
        falconSubjectId: "subj-red-cliff-platform",
        organizationId: "org-red-cliff",
        requestedScopes: [...sourceDemoConfig.defaultScopes],
        sourceReturnUrl: new URL(sourceDemoConfig.callbackUrl),
      }),
    ),
    validatedConnectionStatusUpdate: Effect.runSync(
      Schema.decodeUnknown(UpdateConnectionStatusInput)({
        connectionId: state.connection?.connectionId ?? "connection-id",
        status: "active",
      }),
    ),
  };

  return (
    <PageFrame
      eyebrow="SDK Internals"
      title="The source app demo exposes the exact low-level SDK artifacts it relies on."
      intro="These panels are intentionally mechanical. They prove that the demo is using the same exported SDK surface a real partner app would use for signed app headers, derived public keys, install JWTs, and runtime JWT verification."
    >
      <Panel
        title="Protocol explorer"
        subtitle="Shared schemas and constants stay visible so the mental model and the actual wire contracts never drift apart."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {protocolCatalog.falconSystemScopes.map((scope) => (
            <StatusPill key={scope} tone="good">
              {scope}
            </StatusPill>
          ))}
        </div>
        <JsonCard label="Protocol samples" value={formatJson(protocolCatalog)} />
      </Panel>

      {diagnostics ? (
        <div className="grid gap-6">
          <Panel
            title="Signed app request helpers"
            subtitle="These primitives back the high-level source client when it signs requests to Falcon Connect."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <JsonCard label="Derived public JWK" value={formatJson(diagnostics.publicJwk)} />
              <JsonCard label="Canonical request string" value={String(diagnostics.canonical)} />
              <JsonCard
                label="Signed request output"
                value={formatJson(diagnostics.signedRequest)}
              />
              <JsonCard label="Auth headers" value={formatJson(diagnostics.authHeaders)} />
            </div>
          </Panel>

          <Panel
            title="JWT inspection"
            subtitle="When live tokens are available, the demo decodes and verifies them with the low-level verification helpers."
          >
            <div className="grid gap-4">
              <JsonCard
                label="Latest install token verification"
                value={formatJson(diagnostics.latestIntentVerification)}
              />
              <JsonCard
                label="Latest connection token verification"
                value={formatJson(diagnostics.latestConnectionVerification)}
              />
            </div>
          </Panel>
        </div>
      ) : null}
    </PageFrame>
  );
}
