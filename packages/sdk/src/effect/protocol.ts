import { Schema } from "effect";
import {
  DEFAULT_INSTALL_INTENT_EXPIRATION_SECONDS,
  DEFAULT_SCOPE_REQUIRED_BY_DEFAULT,
} from "./constants";

/** Built-in Falcon Connect system scopes (OAuth-style), e.g. reading app metadata. */
export const falconSystemScopes = Schema.Union(Schema.Literal("read:app-info"));
/** A single system scope string accepted by Falcon Connect. */
export type FalconSystemScope = typeof falconSystemScopes.Type;

/**
 * ASCII email shape: `local@domain` with a dot-separated domain and TLD (common HTML5-style check).
 * For nullable manifests, use {@link Schema.optional} or `Schema.NullOr` as needed.
 */
export const emailString = Schema.String.pipe(
  Schema.pattern(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    {
      identifier: "EmailString",
      description: "a valid email address",
      jsonSchema: { format: "email" },
    },
  ),
);
/** Decoded email string validated by {@link emailString}. */
export type EmailString = typeof emailString.Type;

/** Lifecycle of a trusted app registration in the catalog. */
export const TrustedAppStatus = Schema.Union(Schema.Literal("active"), Schema.Literal("inactive"));
/** Whether a trusted app is currently active or inactive. */
export type TrustedAppStatus = typeof TrustedAppStatus.Type;

/** Signing key lifecycle for a trusted app (rotation and revocation). */
export const TrustedAppKeyStatus = Schema.Union(
  Schema.Literal("active"),
  Schema.Literal("rotated"),
  Schema.Literal("revoked"),
);
/** Status of a trusted app API/signing key. */
export type TrustedAppKeyStatus = typeof TrustedAppKeyStatus.Type;

/** Install (Connect) intent workflow: created → user decision or timeout. */
export const InstallIntentStatus = Schema.Union(
  Schema.Literal("pending"),
  Schema.Literal("approved"),
  Schema.Literal("denied"),
  Schema.Literal("expired"),
  Schema.Literal("cancelled"),
);
/** State of an install intent between source and target app. */
export type InstallIntentStatus = typeof InstallIntentStatus.Type;

const connectionStatusPending = Schema.Literal("pending");
const connectionStatusActive = Schema.Literal("active");
const connectionStatusPaused = Schema.Literal("paused");
const connectionStatusRevoked = Schema.Literal("revoked");
const connectionStatusDenied = Schema.Literal("denied");

/** Connection between apps after install: active use, pause, or end states. */
export const ConnectionStatus = Schema.Union(
  connectionStatusPending,
  connectionStatusActive,
  connectionStatusPaused,
  connectionStatusRevoked,
  connectionStatusDenied,
);
/** State of an established Connect link from source to target app. */
export type ConnectionStatus = typeof ConnectionStatus.Type;

/**
 * Subset of {@link ConnectionStatus} allowed when updating a connection via API
 * (same literals as in {@link ConnectionStatus}, excluding `pending` and `denied`).
 */
export const UpdateConnectionStatus = Schema.Union(
  connectionStatusActive,
  connectionStatusPaused,
  connectionStatusRevoked,
);
/** Inferred type for {@link UpdateConnectionStatus}. */
export type UpdateConnectionStatus = typeof UpdateConnectionStatus.Type;

/** Who performed an auditable action in the Connect system. */
export const connectionAuditActorType = Schema.Union(
  Schema.Literal("system"),
  Schema.Literal("source_app"),
  Schema.Literal("target_app"),
  Schema.Literal("dashboard_user"),
);
/** Actor category for connection audit events. */
export type ConnectionAuditActorType = typeof connectionAuditActorType.Type;

/**
 * Metadata for a single OAuth-style scope offered by a trusted app.
 *
 * Aligns with catalog/manifest scope entries: human-readable labels, whether the scope
 * is a built-in system scope, and default requirement for the consent UI.
 */
export const ScopeDescriptor = Schema.Struct({
  /** Stable scope name (e.g. passed in token claims and API checks). */
  name: Schema.NonEmptyString,
  /** Short label for consent and admin UI. */
  displayName: Schema.NonEmptyString,
  /** Optional longer description for installers and dashboards. */
  description: Schema.optional(Schema.String),
  /** When true, the scope is selected by default in consent flows (Effect default: true). */
  requiredByDefault: Schema.optional(Schema.Boolean).pipe(
    Schema.withDefaults({
      constructor: () => DEFAULT_SCOPE_REQUIRED_BY_DEFAULT,
      decoding: () => DEFAULT_SCOPE_REQUIRED_BY_DEFAULT,
    }),
  ),
  /** True when this scope is a Falcon system scope rather than app-defined. */
  system: Schema.Boolean,
});
/** Inferred type for {@link ScopeDescriptor}. */
export type ScopeDescriptor = typeof ScopeDescriptor.Type;

/**
 * Public trusted-app record: identity, URLs, support contacts, and offered scopes.
 *
 * Useful when rendering install flows and resolving app metadata.
 */
export const TrustedAppManifest = Schema.Struct({
  /** Trusted app identifier. */
  id: Schema.NonEmptyString,
  /** URL-safe slug for routing and display. */
  slug: Schema.NonEmptyString,
  /** Human-readable app name. */
  displayName: Schema.NonEmptyString,
  /** Registration status in the trusted app catalog. */
  status: TrustedAppStatus,
  /** URL where the source app initiates Connect / install requests. */
  connectRequestUrl: Schema.URL,
  /** Base URL for the target app’s data API (token audience / resource server). */
  dataApiBaseUrl: Schema.URL,
  /** Allowed redirect URIs after OAuth-style redirects in the install flow. */
  allowedRedirectUrls: Schema.Array(Schema.URL),
  /** Support contact email. */
  supportEmail: Schema.optional(emailString),
  /** Support or marketing site URL. */
  supportUrl: Schema.optional(Schema.URL),
  /** Scopes this app exposes for connection grants. */
  scopes: Schema.Array(ScopeDescriptor),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});
/** Inferred type for {@link TrustedAppManifest}. */
export type TrustedAppManifest = typeof TrustedAppManifest.Type;

/**
 * Payload to create an install intent: which target app, subject/org, scopes, and return URL.
 *
 * Wire payload for creating an install intent (`expiresInSeconds` is a number per the HTTP contract).
 */
export const CreateInstallIntentInput = Schema.Struct({
  /** Trusted app id the user is connecting to. */
  targetAppId: Schema.NonEmptyString,
  /** End-user or service principal id in Falcon. */
  falconSubjectId: Schema.NonEmptyString,
  /** Tenant / org boundary for the connection. */
  organizationId: Schema.NonEmptyString,
  /** OAuth-style scope names requested for the new connection. */
  requestedScopes: Schema.Array(Schema.String),
  /** Where to send the user back on the source app after the flow. */
  sourceReturnUrl: Schema.URL,
  /** Optional TTL for the intent token (seconds); server may clamp to allowed bounds. */
  expiresInSeconds: Schema.optional(Schema.NonNegative).pipe(
    Schema.withDefaults({
      constructor: () => DEFAULT_INSTALL_INTENT_EXPIRATION_SECONDS,
      decoding: () => DEFAULT_INSTALL_INTENT_EXPIRATION_SECONDS,
    }),
  ),
});
/** Inferred type for {@link CreateInstallIntentInput}. */
export type CreateInstallIntentInput = typeof CreateInstallIntentInput.Type;

/**
 * Server response after creating an install intent: ids, token, and URL to open the Connect UI.
 */
export const CreateInstallIntentResult = Schema.Struct({
  /** Opaque intent record id. */
  intentId: Schema.String,
  /** Secret token passed to resolve/decide endpoints (JWT or opaque string per server). */
  intentToken: Schema.String,
  /** URL the source app should navigate or embed for the user to complete install. */
  connectUrl: Schema.URL,
  /** When the intent token expires. */
  expiresAt: Schema.Date,
  /** Calling (source) trusted app id. */
  sourceAppId: Schema.String,
  /** Target trusted app id (same as requested). */
  targetAppId: Schema.String,
  /** Scopes that were requested for this intent. */
  requestedScopes: Schema.Array(Schema.String),
});
/** Inferred type for {@link CreateInstallIntentResult}. */
export type CreateInstallIntentResult = typeof CreateInstallIntentResult.Type;

/** JWT / opaque token claims for an install intent handoff. */
export const InstallIntentClaims = Schema.Struct({
  kind: Schema.Literal("falcon-connect-install-intent"),
  intentId: Schema.NonEmptyString,
  sourceAppId: Schema.NonEmptyString,
  targetAppId: Schema.NonEmptyString,
});
/** Inferred type for {@link InstallIntentClaims}. */
export type InstallIntentClaims = typeof InstallIntentClaims.Type;

/** Input to resolve an install intent from a token. */
export const ResolveInstallIntentInput = Schema.Struct({
  intentToken: Schema.NonEmptyString,
});
/** Inferred type for {@link ResolveInstallIntentInput}. */
export type ResolveInstallIntentInput = typeof ResolveInstallIntentInput.Type;

/** One scope row in the resolved install intent (consent UI state). */
export const ResolvedInstallIntentScope = Schema.Struct({
  name: Schema.NonEmptyString,
  displayName: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  required: Schema.Boolean,
  system: Schema.Boolean,
  selected: Schema.Boolean,
});
/** Inferred type for {@link ResolvedInstallIntentScope}. */
export type ResolvedInstallIntentScope = typeof ResolvedInstallIntentScope.Type;

const TrustedAppManifestResolvedIntentSummary = TrustedAppManifest.pipe(
  Schema.pick("id", "slug", "displayName", "dataApiBaseUrl", "supportEmail", "supportUrl"),
);

/** Fully resolved install intent for display and consent. */
export const ResolvedInstallIntent = Schema.Struct({
  intentId: Schema.NonEmptyString,
  status: InstallIntentStatus,
  sourceApp: TrustedAppManifestResolvedIntentSummary,
  targetApp: TrustedAppManifestResolvedIntentSummary,
  falconSubjectId: Schema.NonEmptyString,
  organizationId: Schema.NonEmptyString,
  sourceReturnUrl: Schema.URL,
  scopes: Schema.Array(ResolvedInstallIntentScope),
  expiresAt: Schema.Date,
});
/** Inferred type for {@link ResolvedInstallIntent}. */
export type ResolvedInstallIntent = typeof ResolvedInstallIntent.Type;

const DecideInstallIntentInputBase = Schema.Struct({
  intentToken: Schema.NonEmptyString,
  grantedScopes: Schema.Array(Schema.NonEmptyString).pipe(
    Schema.optionalWith({ default: () => [] as ReadonlyArray<string> }),
  ),
  deniedReason: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(500))),
});

/** Approve or deny an install intent (discriminated by `approved`). */
export const DecideInstallIntentInput = Schema.Union(
  Schema.extend(DecideInstallIntentInputBase, Schema.Struct({ approved: Schema.Literal(true) })),
  Schema.extend(DecideInstallIntentInputBase, Schema.Struct({ approved: Schema.Literal(false) })),
);
/** Inferred type for {@link DecideInstallIntentInput}. */
export type DecideInstallIntentInput = typeof DecideInstallIntentInput.Type;

/** Persisted connection between source and target apps after install completes. */
export const ConnectionRecord = Schema.Struct({
  id: Schema.NonEmptyString,
  sourceAppId: Schema.NonEmptyString,
  targetAppId: Schema.NonEmptyString,
  falconSubjectId: Schema.NonEmptyString,
  organizationId: Schema.NonEmptyString,
  status: ConnectionStatus,
  targetDataApiBaseUrl: Schema.URL,
  grantedScopes: Schema.Array(ResolvedInstallIntentScope),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  activatedAt: Schema.NullOr(Schema.Date),
  pausedAt: Schema.NullOr(Schema.Date),
  revokedAt: Schema.NullOr(Schema.Date),
  revocationReason: Schema.NullOr(Schema.String),
});
/** Inferred type for {@link ConnectionRecord}. */
export type ConnectionRecord = typeof ConnectionRecord.Type;

/** Result of approving/denying an install intent (status, optional connection, redirect). */
export const DecideInstallIntentResult = Schema.Struct({
  status: InstallIntentStatus,
  connection: Schema.NullOr(ConnectionRecord),
  redirectUrl: Schema.URL,
});
/** Inferred type for {@link DecideInstallIntentResult}. */
export type DecideInstallIntentResult = typeof DecideInstallIntentResult.Type;

/** Request a short-lived connection access token. */
export const IssueConnectionTokenInput = Schema.Struct({
  connectionId: Schema.NonEmptyString,
  expiresInSeconds: Schema.optional(Schema.Int.pipe(Schema.between(60, 3600))),
});
/** Inferred type for {@link IssueConnectionTokenInput}. */
export type IssueConnectionTokenInput = typeof IssueConnectionTokenInput.Type;

/** Look up a connection by subject, org, and target app. */
export const FindConnectionInput = Schema.Struct({
  targetAppId: Schema.NonEmptyString,
  falconSubjectId: Schema.NonEmptyString,
  organizationId: Schema.NonEmptyString,
});
/** Inferred type for {@link FindConnectionInput}. */
export type FindConnectionInput = typeof FindConnectionInput.Type;

/** Look up an incoming connection by source app, subject, and org (target-side). */
export const FindIncomingConnectionInput = Schema.Struct({
  sourceAppId: Schema.NonEmptyString,
  falconSubjectId: Schema.NonEmptyString,
  organizationId: Schema.NonEmptyString,
});
/** Inferred type for {@link FindIncomingConnectionInput}. */
export type FindIncomingConnectionInput = typeof FindIncomingConnectionInput.Type;

/** Claims carried in a connection access token (JWT-style). */
export const ConnectionAccessTokenClaims = Schema.Struct({
  kind: Schema.Literal("falcon-connect-connection"),
  connectionId: Schema.NonEmptyString,
  sourceAppId: Schema.NonEmptyString,
  targetAppId: Schema.NonEmptyString,
  falconSubjectId: Schema.NonEmptyString,
  organizationId: Schema.NonEmptyString,
  scopes: Schema.Array(Schema.NonEmptyString),
  jti: Schema.NonEmptyString,
  iss: Schema.NonEmptyString,
  aud: Schema.NonEmptyString,
  sub: Schema.NonEmptyString,
  iat: Schema.NonNegativeInt,
  exp: Schema.NonNegativeInt,
});
/** Inferred type for {@link ConnectionAccessTokenClaims}. */
export type ConnectionAccessTokenClaims = typeof ConnectionAccessTokenClaims.Type;

/** Issued connection token and decoded claims. */
export const IssueConnectionTokenResult = Schema.Struct({
  token: Schema.NonEmptyString,
  expiresAt: Schema.Date,
  claims: ConnectionAccessTokenClaims,
});
/** Inferred type for {@link IssueConnectionTokenResult}. */
export type IssueConnectionTokenResult = typeof IssueConnectionTokenResult.Type;

const IntrospectConnectionInputStruct = Schema.Struct({
  connectionId: Schema.optional(Schema.NonEmptyString),
  connectionToken: Schema.optional(Schema.NonEmptyString),
});

/** Introspect by connection id and/or token (at least one required). */
export const IntrospectConnectionInput = IntrospectConnectionInputStruct.pipe(
  Schema.filter((value) => {
    return value.connectionId !== undefined || value.connectionToken !== undefined
      ? true
      : {
          path: ["connectionId"],
          message: "Either connectionId or connectionToken is required",
        };
  }),
);
/** Inferred type for {@link IntrospectConnectionInput}. */
export type IntrospectConnectionInput = typeof IntrospectConnectionInput.Type;

/** Active flag and optional connection snapshot from introspection. */
export const IntrospectionResult = Schema.Struct({
  active: Schema.Boolean,
  reason: Schema.NullOr(Schema.String),
  connection: Schema.NullOr(ConnectionRecord),
});
/** Inferred type for {@link IntrospectionResult}. */
export type IntrospectionResult = typeof IntrospectionResult.Type;

/** Trusted app API / signing key metadata. */
export const TrustedAppKey = Schema.Struct({
  id: Schema.NonEmptyString,
  appId: Schema.NonEmptyString,
  keyId: Schema.NonEmptyString,
  algorithm: Schema.NonEmptyString,
  status: TrustedAppKeyStatus,
  createdAt: Schema.Date,
  rotatedAt: Schema.NullOr(Schema.Date),
});
/** Inferred type for {@link TrustedAppKey}. */
export type TrustedAppKey = typeof TrustedAppKey.Type;

/** Stored install intent row (server-side). */
export const InstallIntentRecord = Schema.Struct({
  id: Schema.NonEmptyString,
  sourceAppId: Schema.NonEmptyString,
  targetAppId: Schema.NonEmptyString,
  falconSubjectId: Schema.NonEmptyString,
  organizationId: Schema.NonEmptyString,
  status: InstallIntentStatus,
  requestedScopes: Schema.Array(Schema.NonEmptyString),
  sourceReturnUrl: Schema.URL,
  expiresAt: Schema.Date,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});
/** Inferred type for {@link InstallIntentRecord}. */
export type InstallIntentRecord = typeof InstallIntentRecord.Type;

/** Auditable Connect event (install, token, status changes, etc.). */
export const ConnectionAuditEvent = Schema.Struct({
  id: Schema.NonEmptyString,
  connectionId: Schema.NullOr(Schema.NonEmptyString),
  installIntentId: Schema.NullOr(Schema.NonEmptyString),
  eventType: Schema.NonEmptyString,
  actorType: connectionAuditActorType,
  actorId: Schema.NullOr(Schema.NonEmptyString),
  payload: Schema.Record({ key: Schema.NonEmptyString, value: Schema.Any }),
  createdAt: Schema.Date,
});
/** Inferred type for {@link ConnectionAuditEvent}. */
export type ConnectionAuditEvent = typeof ConnectionAuditEvent.Type;

/** Aggregate counts for ops / dashboard overview. */
export const OpsOverview = Schema.Struct({
  trustedAppCount: Schema.NonNegativeInt,
  activeConnectionCount: Schema.NonNegativeInt,
  pendingInstallIntentCount: Schema.NonNegativeInt,
  pausedConnectionCount: Schema.NonNegativeInt,
});
/** Inferred type for {@link OpsOverview}. */
export type OpsOverview = typeof OpsOverview.Type;

/** Admin or API update to connection lifecycle (active / paused / revoked). */
export const UpdateConnectionStatusInput = Schema.Struct({
  connectionId: Schema.NonEmptyString,
  status: UpdateConnectionStatus,
  reason: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(500))),
});
/** Inferred type for {@link UpdateConnectionStatusInput}. */
export type UpdateConnectionStatusInput = typeof UpdateConnectionStatusInput.Type;
