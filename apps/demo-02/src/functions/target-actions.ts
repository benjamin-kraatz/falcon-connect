import { IntentToken } from "@falcon/sdk/effect";
import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { z } from "zod";

import { buildTargetSdkDiagnostics, targetClient } from "@/lib/target-server";

const intentTokenSchema = z.object({
  intentToken: z.string().min(1),
});

const approvalSchema = z.object({
  intentToken: z.string().min(1),
  selectedScopeNames: z.array(z.string().min(1)),
});

const denialSchema = z.object({
  intentToken: z.string().min(1),
  deniedReason: z.string().min(1).max(500),
});

const diagnosticsSchema = z.object({
  latestIntentToken: z.string().min(1).nullable().optional(),
  latestConnectionToken: z.string().min(1).nullable().optional(),
});

export const resolveInstallIntentAction = createServerFn({ method: "POST" })
  .inputValidator(intentTokenSchema)
  .handler(async ({ data }) => {
    return Effect.runPromise(targetClient.resolveInstallIntent(IntentToken.make(data.intentToken)));
  });

export const approveInstallIntentAction = createServerFn({ method: "POST" })
  .inputValidator(approvalSchema)
  .handler(async ({ data }) => {
    const intent = await Effect.runPromise(
      targetClient.resolveInstallIntent(IntentToken.make(data.intentToken)),
    );
    return Effect.runPromise(
      targetClient.approveInstallIntent({
        intent,
        intentToken: IntentToken.make(data.intentToken),
        selectedScopeNames: data.selectedScopeNames,
      }),
    );
  });

export const denyInstallIntentAction = createServerFn({ method: "POST" })
  .inputValidator(denialSchema)
  .handler(async ({ data }) => {
    return Effect.runPromise(
      targetClient.submitInstallIntentDecision({
        intentToken: data.intentToken,
        approved: false,
        deniedReason: data.deniedReason,
        grantedScopes: [],
      }),
    );
  });

export const buildTargetSdkDiagnosticsAction = createServerFn({ method: "POST" })
  .inputValidator(diagnosticsSchema)
  .handler(async ({ data }) => {
    return buildTargetSdkDiagnostics(
      Object.assign(
        {},
        data.latestIntentToken === undefined ? {} : { latestIntentToken: data.latestIntentToken },
        data.latestConnectionToken === undefined
          ? {}
          : { latestConnectionToken: data.latestConnectionToken },
      ),
    );
  });
