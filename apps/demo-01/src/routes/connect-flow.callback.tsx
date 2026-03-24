import { createFileRoute } from "@tanstack/react-router";
import { createFalconConnectSourceClient } from "@falcon/sdk";
import { useEffect, useState } from "react";

import { PageFrame, Panel, RouteLink, StatusPill } from "@/components/ui";
import { sourceDemoConfig } from "@/lib/config";
import { persistApprovedSourceConnection } from "@/lib/storage";
import { useSourceDemoState } from "@/lib/use-source-state";

export const Route = createFileRoute("/connect-flow/callback")({
  component: RouteComponent,
});

const callbackParser = createFalconConnectSourceClient({
  baseUrl: sourceDemoConfig.falconBaseUrl,
  appId: sourceDemoConfig.appId,
  keyId: sourceDemoConfig.keyId,
  privateJwk: {
    crv: "Ed25519",
    d: "NjqP_iJJX-dycue8bwvu7iUZq_xJ_i3eLeTo1t2OeBU",
    x: "jRb4Sc7A4pKsWiBnjuJaFQ2b0aH-e4E7UyK5U1ZhHfM",
    kty: "OKP",
  },
});

function RouteComponent() {
  const { state, updateState } = useSourceDemoState();
  const [callback, setCallback] = useState<ReturnType<
    typeof callbackParser.parseInstallCallback
  > | null>(null);

  useEffect(() => {
    setCallback(callbackParser.parseInstallCallback(window.location.href));
  }, []);

  useEffect(() => {
    if (callback?.status !== "approved" || !callback.connectionId || !callback.intentId) {
      return;
    }

    const connectionId = callback.connectionId;
    const intentId = callback.intentId;
    const callbackUrl = typeof window === "undefined" ? "" : window.location.href;

    updateState((current) =>
      persistApprovedSourceConnection({
        connectionId,
        intentId,
        grantedScopes:
          current.latestIntent?.requestedScopes ?? current.connection?.grantedScopes ?? [],
        callbackUrl,
      }),
    );
  }, [callback, updateState]);

  const tone =
    callback?.status === "approved"
      ? "good"
      : callback?.status === "denied" || callback?.status === "expired"
        ? "bad"
        : "warn";

  return (
    <PageFrame
      eyebrow="Install Callback"
      title="Project Hub parses Falcon’s callback query and stores the connection identifier for later runtime use."
      intro="The callback is the only place the source app learns whether the target-side user approved, denied, or let the install expire. On approval, the durable asset is the connectionId."
    >
      <Panel
        title="Callback result"
        subtitle="This page uses the SDK callback parser exactly as a partner application would."
      >
        <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="space-y-4">
            <StatusPill tone={tone}>{callback?.status ?? "unknown"}</StatusPill>
            <div className="rounded-[1.25rem] border border-white/10 bg-[var(--panel-strong)] p-4 text-sm leading-7 text-[var(--muted)]">
              <p>
                Intent ID:{" "}
                <span className="break-all text-[var(--ink)]">
                  {callback?.intentId ?? "missing"}
                </span>
              </p>
              <p>
                Connection ID:{" "}
                <span className="break-all text-[var(--ink)]">
                  {callback?.connectionId ?? "not issued"}
                </span>
              </p>
              <p>
                Reason: <span className="text-[var(--ink)]">{callback?.reason ?? "none"}</span>
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            <RouteLink
              to="/runtime-calls"
              title="Runtime Calls"
              description="If the install was approved, continue here to mint Falcon connection tokens and call Incident Ops directly."
            />
            <RouteLink
              to="/connect-flow"
              title="Reconnect"
              description="Run the install flow again. Falcon will update the same directional relationship if the tuple matches."
            />
            <RouteLink
              to="/sdk-internals"
              title="Inspect SDK output"
              description="See the same callback outcome alongside decoded and verified JWT artifacts."
            />
          </div>
        </div>
      </Panel>

      {state.connection ? (
        <Panel
          title="Stored source-side connection state"
          subtitle="Project Hub only keeps the connection handle plus its own local relationship metadata."
        >
          <div className="rounded-[1.25rem] border border-white/10 bg-[var(--panel-strong)] p-4">
            <pre className="overflow-x-auto text-xs leading-6 text-[var(--ink)]">
              {JSON.stringify(state.connection, null, 2)}
            </pre>
          </div>
        </Panel>
      ) : null}
    </PageFrame>
  );
}
