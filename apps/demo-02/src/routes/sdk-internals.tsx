import {
  buildConsentSelection,
  connectionStatusSchema,
  falconSystemScopes,
  normalizeGrantedScopes,
  resolvedInstallIntentSchema,
  trustedAppStatusSchema,
} from "@falcon/sdk";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { JsonCard, PageFrame, Panel, StatusPill } from "@/components/ui";
import { formatJson } from "@/lib/format";
import type { TargetSdkDiagnostics } from "@/lib/target-server";
import { useTargetDemoState } from "@/lib/use-target-state";
import { buildTargetSdkDiagnosticsAction } from "@/functions/target-actions";

export const Route = createFileRoute("/sdk-internals")({
  component: RouteComponent,
});

function RouteComponent() {
  const { state } = useTargetDemoState();
  const [diagnostics, setDiagnostics] = useState<TargetSdkDiagnostics | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const result = await buildTargetSdkDiagnosticsAction({
          data: {
            latestIntentToken: state.latestIntentToken,
            latestConnectionToken: state.latestVerificationToken,
          },
        });
        setDiagnostics(result as TargetSdkDiagnostics);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to build diagnostics";
        toast.error(message);
      }
    })();
  }, [state.latestIntentToken, state.latestVerificationToken]);

  const consentPreview = useMemo(() => {
    if (!state.latestResolvedIntent) {
      return null;
    }

    return {
      validatedIntent: resolvedInstallIntentSchema.parse(state.latestResolvedIntent),
      selection: buildConsentSelection(state.latestResolvedIntent),
      normalizedScopes: normalizeGrantedScopes(state.latestResolvedIntent),
    };
  }, [state.latestResolvedIntent]);

  const protocolCatalog = {
    falconSystemScopes,
    trustedAppStatus: trustedAppStatusSchema.options,
    connectionStatus: connectionStatusSchema.options,
  };

  return (
    <PageFrame
      eyebrow="SDK Internals"
      title="The target app demo shows the verification and consent helpers directly."
      intro="This page is where the low-level pieces become visible: signed app headers, request verification, consent selection helpers, and the high-level target client verification response."
    >
      <Panel
        title="Protocol catalog"
        subtitle="Shared constants and status enums used across the target implementation."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {falconSystemScopes.map((scope) => (
            <StatusPill key={scope} tone="good">
              {scope}
            </StatusPill>
          ))}
        </div>
        <JsonCard label="Protocol status catalog" value={formatJson(protocolCatalog)} />
      </Panel>

      {consentPreview ? (
        <Panel
          title="Consent helpers"
          subtitle="These helpers drive the real consent screen rather than a fake SDK-only example."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <JsonCard
              label="buildConsentSelection(intent)"
              value={formatJson(consentPreview.selection)}
            />
            <JsonCard
              label="normalizeGrantedScopes(intent)"
              value={formatJson(consentPreview.normalizedScopes)}
            />
          </div>
        </Panel>
      ) : null}

      {diagnostics ? (
        <Panel
          title="Signed headers and verification"
          subtitle="The target-side private key signs Falcon requests and can also verify the corresponding request signature locally."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <JsonCard label="Derived public JWK" value={formatJson(diagnostics.publicJwk)} />
            <JsonCard label="Canonical request" value={String(diagnostics.canonical)} />
            <JsonCard label="Signed request output" value={formatJson(diagnostics.signed)} />
            <JsonCard label="Auth headers" value={formatJson(diagnostics.authHeaders)} />
            <JsonCard
              label="verifyFalconAppRequest result"
              value={formatJson(diagnostics.verified)}
            />
            <JsonCard
              label="Decoded latest install token"
              value={formatJson(diagnostics.latestIntentDecoded)}
            />
            <JsonCard
              label="verifyConnectionToken result"
              value={formatJson(diagnostics.liveVerification)}
            />
          </div>
        </Panel>
      ) : null}
    </PageFrame>
  );
}
