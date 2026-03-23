import type { CreateInstallIntentResult, IssueConnectionTokenResult } from "@falcon/sdk";

export type SourceRuntimeCall = {
  id: string;
  endpoint: string;
  mode: "local" | "force-introspection";
  requestedAt: string;
  outcome: "ok" | "error";
  note: string;
};

export type SourceConnectionState = {
  connectionId: string;
  intentId: string;
  status: string;
  grantedScopes: string[];
  callbackUrl: string;
  updatedAt: string;
};

export type SourceDemoState = {
  workspaceId: string;
  latestIntent: CreateInstallIntentResult | null;
  connection: SourceConnectionState | null;
  latestToken: IssueConnectionTokenResult | null;
  latestTokenPreview: string | null;
  runtimeCalls: SourceRuntimeCall[];
};

const STORAGE_KEY = "falcon-connect-demo-source-state";

export const defaultSourceDemoState: SourceDemoState = {
  workspaceId: "ws-red-cliff",
  latestIntent: null,
  connection: null,
  latestToken: null,
  latestTokenPreview: null,
  runtimeCalls: [],
};

export function readSourceDemoState() {
  if (typeof window === "undefined") {
    return defaultSourceDemoState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return defaultSourceDemoState;
  }

  try {
    return {
      ...defaultSourceDemoState,
      ...(JSON.parse(raw) as Partial<SourceDemoState>),
    } satisfies SourceDemoState;
  } catch {
    return defaultSourceDemoState;
  }
}

export function writeSourceDemoState(nextState: SourceDemoState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export function persistApprovedSourceConnection(input: {
  connectionId: string;
  intentId: string;
  grantedScopes: string[];
  callbackUrl: string;
}) {
  const current = readSourceDemoState();
  const nextState: SourceDemoState = {
    ...current,
    connection: {
      connectionId: input.connectionId,
      intentId: input.intentId,
      status: "approved",
      grantedScopes: [...input.grantedScopes],
      callbackUrl: input.callbackUrl,
      updatedAt: new Date().toISOString(),
    },
  };

  writeSourceDemoState(nextState);
  return nextState;
}
