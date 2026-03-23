import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sourceDemoConfig } from "@/lib/config";
import { buildSourceSdkDiagnostics, sourceClient } from "@/lib/source-server";

const workspacePayloadSchema = z.object({
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
  requestedScopes: z.array(z.string().min(1)),
});

const connectionSchema = z.object({
  connectionId: z.string().min(1),
});

const recoverConnectionSchema = z.object({
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
});

const diagnosticsSchema = z.object({
  connectionId: z.string().min(1).nullable().optional(),
  latestIntentToken: z.string().min(1).nullable().optional(),
  latestToken: z.string().min(1).nullable().optional(),
});

export const createInstallIntentAction = createServerFn({ method: "POST" })
  .inputValidator(workspacePayloadSchema)
  .handler(async ({ data }) => {
    return sourceClient.createInstallIntent({
      targetAppId: sourceDemoConfig.targetAppId,
      falconSubjectId: data.falconSubjectId,
      organizationId: data.organizationId,
      requestedScopes: data.requestedScopes,
      sourceReturnUrl: sourceDemoConfig.callbackUrl,
      expiresInSeconds: 900,
    });
  });

export const issueConnectionTokenAction = createServerFn({ method: "POST" })
  .inputValidator(connectionSchema)
  .handler(async ({ data }) => {
    return sourceClient.issueConnectionAccessToken({
      connectionId: data.connectionId,
      expiresInSeconds: 300,
    });
  });

export const recoverConnectionAction = createServerFn({ method: "POST" })
  .inputValidator(recoverConnectionSchema)
  .handler(async ({ data }) => {
    return sourceClient.findConnection({
      targetAppId: sourceDemoConfig.targetAppId,
      falconSubjectId: data.falconSubjectId,
      organizationId: data.organizationId,
    });
  });

export const buildSourceSdkDiagnosticsAction = createServerFn({ method: "POST" })
  .inputValidator(diagnosticsSchema)
  .handler(async ({ data }) => {
    const latestIntent = data.latestIntentToken
      ? {
          intentId: "live",
          intentToken: data.latestIntentToken,
          connectUrl: `${sourceDemoConfig.targetBaseUrl}/connect-flow`,
          expiresAt: new Date().toISOString(),
          sourceAppId: sourceDemoConfig.appId,
          targetAppId: sourceDemoConfig.targetAppId,
          requestedScopes: [...sourceDemoConfig.defaultScopes],
        }
      : null;

    const latestToken = data.latestToken
      ? {
          token: data.latestToken,
          expiresAt: new Date().toISOString(),
          claims: {
            kind: "falcon-connect-connection" as const,
            connectionId: data.connectionId ?? "unknown",
            sourceAppId: sourceDemoConfig.appId,
            targetAppId: sourceDemoConfig.targetAppId,
            falconSubjectId: "subject",
            organizationId: "organization",
            scopes: [...sourceDemoConfig.defaultScopes],
            jti: "demo",
            iss: sourceDemoConfig.falconBaseUrl,
            aud: sourceDemoConfig.targetAppId,
            sub: "subject",
            iat: 0,
            exp: 0,
          },
        }
      : null;

    return buildSourceSdkDiagnostics(
      Object.assign(
        {
          latestIntent,
          latestToken,
        },
        data.connectionId === undefined ? {} : { connectionId: data.connectionId },
      ),
    );
  });
