import type { DecideInstallIntentResult, ResolvedInstallIntent } from "@falcon/sdk";

import type { IncidentSession } from "./demo-data";

export type TargetVerificationLog = {
  id: string;
  mode: string;
  outcome: "ok" | "error";
  message: string;
  createdAt: string;
};

export type TargetDemoState = {
  session: IncidentSession | null;
  latestIntentToken: string | null;
  latestResolvedIntent: ResolvedInstallIntent | null;
  lastDecision: DecideInstallIntentResult | null;
  latestVerificationToken: string | null;
  verificationHistory: TargetVerificationLog[];
};

const STORAGE_KEY = "falcon-connect-demo-target-state";

export const defaultTargetState: TargetDemoState = {
  session: null,
  latestIntentToken: null,
  latestResolvedIntent: null,
  lastDecision: null,
  latestVerificationToken: null,
  verificationHistory: [],
};

export function readTargetState() {
  if (typeof window === "undefined") {
    return defaultTargetState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return defaultTargetState;
  }

  try {
    return {
      ...defaultTargetState,
      ...(JSON.parse(raw) as Partial<TargetDemoState>),
    } satisfies TargetDemoState;
  } catch {
    return defaultTargetState;
  }
}

export function writeTargetState(nextState: TargetDemoState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}
