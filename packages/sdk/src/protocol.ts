import { z } from "zod";

export const falconSystemScopes = ["read:app-info"] as const;

export const trustedAppStatusSchema = z.enum(["active", "inactive"]);
export const trustedAppKeyStatusSchema = z.enum(["active", "rotated", "revoked"]);
export const installIntentStatusSchema = z.enum([
  "pending",
  "approved",
  "denied",
  "expired",
  "cancelled",
]);
export const connectionStatusSchema = z.enum(["pending", "active", "paused", "revoked", "denied"]);
export const connectionAuditActorTypeSchema = z.enum([
  "system",
  "source_app",
  "target_app",
  "dashboard_user",
]);

export const scopeDescriptorSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  requiredByDefault: z.boolean().default(false),
  system: z.boolean().default(false),
});

export const trustedAppManifestSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  displayName: z.string().min(1),
  status: trustedAppStatusSchema,
  connectRequestUrl: z.url(),
  dataApiBaseUrl: z.url(),
  allowedRedirectUrls: z.array(z.url()).min(1),
  supportEmail: z.email().nullable(),
  supportUrl: z.url().nullable(),
  scopes: z.array(scopeDescriptorSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createInstallIntentInputSchema = z.object({
  targetAppId: z.string().min(1),
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
  requestedScopes: z.array(z.string().min(1)).default([]),
  sourceReturnUrl: z.url(),
  expiresInSeconds: z.number().int().min(60).max(3600).optional(),
});

export const createInstallIntentResultSchema = z.object({
  intentId: z.string().min(1),
  intentToken: z.string().min(1),
  connectUrl: z.url(),
  expiresAt: z.string().datetime(),
  sourceAppId: z.string().min(1),
  targetAppId: z.string().min(1),
  requestedScopes: z.array(z.string().min(1)),
});

export const installIntentTokenClaimsSchema = z.object({
  kind: z.literal("falcon-connect-install-intent"),
  intentId: z.string().min(1),
  sourceAppId: z.string().min(1),
  targetAppId: z.string().min(1),
});

export const resolveInstallIntentInputSchema = z.object({
  intentToken: z.string().min(1),
});

export const resolvedInstallIntentScopeSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
  system: z.boolean(),
  selected: z.boolean(),
});

export const resolvedInstallIntentSchema = z.object({
  intentId: z.string().min(1),
  status: installIntentStatusSchema,
  sourceApp: trustedAppManifestSchema.pick({
    id: true,
    slug: true,
    displayName: true,
    dataApiBaseUrl: true,
    supportEmail: true,
    supportUrl: true,
  }),
  targetApp: trustedAppManifestSchema.pick({
    id: true,
    slug: true,
    displayName: true,
    dataApiBaseUrl: true,
    supportEmail: true,
    supportUrl: true,
  }),
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
  sourceReturnUrl: z.url(),
  scopes: z.array(resolvedInstallIntentScopeSchema),
  expiresAt: z.string().datetime(),
});

export const decideInstallIntentInputSchema = z
  .object({
    intentToken: z.string().min(1),
    grantedScopes: z.array(z.string().min(1)).default([]),
    deniedReason: z.string().trim().min(1).max(500).optional(),
  })
  .and(
    z.discriminatedUnion("approved", [
      z.object({
        approved: z.literal(true),
      }),
      z.object({
        approved: z.literal(false),
      }),
    ]),
  );

export const connectionRecordSchema = z.object({
  id: z.string().min(1),
  sourceAppId: z.string().min(1),
  targetAppId: z.string().min(1),
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
  status: connectionStatusSchema,
  targetDataApiBaseUrl: z.url(),
  grantedScopes: z.array(resolvedInstallIntentScopeSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  activatedAt: z.string().datetime().nullable(),
  pausedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  revocationReason: z.string().nullable(),
});

export const decideInstallIntentResultSchema = z.object({
  status: installIntentStatusSchema,
  connection: connectionRecordSchema.nullable(),
  redirectUrl: z.url(),
});

export const issueConnectionTokenInputSchema = z.object({
  connectionId: z.string().min(1),
  expiresInSeconds: z.number().int().min(60).max(3600).optional(),
});

export const findConnectionInputSchema = z.object({
  targetAppId: z.string().min(1),
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
});

export const findIncomingConnectionInputSchema = z.object({
  sourceAppId: z.string().min(1),
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
});

export const connectionAccessTokenClaimsSchema = z.object({
  kind: z.literal("falcon-connect-connection"),
  connectionId: z.string().min(1),
  sourceAppId: z.string().min(1),
  targetAppId: z.string().min(1),
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
  scopes: z.array(z.string().min(1)),
  jti: z.string().min(1),
  iss: z.string().min(1),
  aud: z.string().min(1),
  sub: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

export const issueConnectionTokenResultSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
  claims: connectionAccessTokenClaimsSchema,
});

export const introspectConnectionInputSchema = z
  .object({
    connectionId: z.string().min(1).optional(),
    connectionToken: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.connectionId || value.connectionToken), {
    message: "Either connectionId or connectionToken is required",
    path: ["connectionId"],
  });

export const introspectionResultSchema = z.object({
  active: z.boolean(),
  reason: z.string().nullable(),
  connection: connectionRecordSchema.nullable(),
});

export const trustedAppKeySchema = z.object({
  id: z.string().min(1),
  appId: z.string().min(1),
  keyId: z.string().min(1),
  algorithm: z.string().min(1),
  status: trustedAppKeyStatusSchema,
  createdAt: z.string().datetime(),
  rotatedAt: z.string().datetime().nullable(),
});

export const installIntentRecordSchema = z.object({
  id: z.string().min(1),
  sourceAppId: z.string().min(1),
  targetAppId: z.string().min(1),
  falconSubjectId: z.string().min(1),
  organizationId: z.string().min(1),
  status: installIntentStatusSchema,
  requestedScopes: z.array(z.string().min(1)),
  sourceReturnUrl: z.url(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const connectionAuditEventSchema = z.object({
  id: z.string().min(1),
  connectionId: z.string().nullable(),
  installIntentId: z.string().nullable(),
  eventType: z.string().min(1),
  actorType: connectionAuditActorTypeSchema,
  actorId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});

export const opsOverviewSchema = z.object({
  trustedAppCount: z.number().int().nonnegative(),
  activeConnectionCount: z.number().int().nonnegative(),
  pendingInstallIntentCount: z.number().int().nonnegative(),
  pausedConnectionCount: z.number().int().nonnegative(),
});

export const updateConnectionStatusInputSchema = z.object({
  connectionId: z.string().min(1),
  status: z.enum(["active", "paused", "revoked"]),
  reason: z.string().trim().min(1).max(500).optional(),
});

export type ScopeDescriptor = z.infer<typeof scopeDescriptorSchema>;
export type TrustedAppManifest = z.infer<typeof trustedAppManifestSchema>;
export type CreateInstallIntentInput = z.infer<typeof createInstallIntentInputSchema>;
export type CreateInstallIntentResult = z.infer<typeof createInstallIntentResultSchema>;
export type InstallIntentTokenClaims = z.infer<typeof installIntentTokenClaimsSchema>;
export type ResolvedInstallIntent = z.infer<typeof resolvedInstallIntentSchema>;
export type ResolvedInstallIntentScope = z.infer<typeof resolvedInstallIntentScopeSchema>;
export type DecideInstallIntentInput = z.infer<typeof decideInstallIntentInputSchema>;
export type DecideInstallIntentResult = z.infer<typeof decideInstallIntentResultSchema>;
export type ConnectionRecord = z.infer<typeof connectionRecordSchema>;
export type IssueConnectionTokenInput = z.infer<typeof issueConnectionTokenInputSchema>;
export type FindConnectionInput = z.infer<typeof findConnectionInputSchema>;
export type FindIncomingConnectionInput = z.infer<typeof findIncomingConnectionInputSchema>;
export type ConnectionAccessTokenClaims = z.infer<typeof connectionAccessTokenClaimsSchema>;
export type IssueConnectionTokenResult = z.infer<typeof issueConnectionTokenResultSchema>;
export type IntrospectConnectionInput = z.infer<typeof introspectConnectionInputSchema>;
export type IntrospectionResult = z.infer<typeof introspectionResultSchema>;
export type TrustedAppKey = z.infer<typeof trustedAppKeySchema>;
export type InstallIntentRecord = z.infer<typeof installIntentRecordSchema>;
export type ConnectionAuditEvent = z.infer<typeof connectionAuditEventSchema>;
export type OpsOverview = z.infer<typeof opsOverviewSchema>;
export type UpdateConnectionStatusInput = z.infer<typeof updateConnectionStatusInputSchema>;
export type TrustedAppStatus = z.infer<typeof trustedAppStatusSchema>;
export type InstallIntentStatus = z.infer<typeof installIntentStatusSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
