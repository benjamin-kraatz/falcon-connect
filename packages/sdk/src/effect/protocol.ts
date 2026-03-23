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
export const trustedAppStatus = Schema.Union(Schema.Literal("active"), Schema.Literal("inactive"));
/** Whether a trusted app is currently active or inactive. */
export type TrustedAppStatus = typeof trustedAppStatus.Type;

/** Signing key lifecycle for a trusted app (rotation and revocation). */
export const trustedAppKeyStatus = Schema.Union(
  Schema.Literal("active"),
  Schema.Literal("rotated"),
  Schema.Literal("revoked"),
);
/** Status of a trusted app API/signing key. */
export type TrustedAppKeyStatus = typeof trustedAppKeyStatus.Type;

/** Install (Connect) intent workflow: created → user decision or timeout. */
export const installIntentStatus = Schema.Union(
  Schema.Literal("pending"),
  Schema.Literal("approved"),
  Schema.Literal("denied"),
  Schema.Literal("expired"),
  Schema.Literal("cancelled"),
);
/** State of an install intent between source and target app. */
export type InstallIntentStatus = typeof installIntentStatus.Type;

/** Connection between apps after install: active use, pause, or end states. */
export const connectionStatus = Schema.Union(
  Schema.Literal("pending"),
  Schema.Literal("active"),
  Schema.Literal("paused"),
  Schema.Literal("revoked"),
  Schema.Literal("denied"),
);
/** State of an established Connect link from source to target app. */
export type ConnectionStatus = typeof connectionStatus.Type;

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
export const scopeDescriptor = Schema.Struct({
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
/** Inferred type for {@link scopeDescriptor}. */
export type ScopeDescriptor = typeof scopeDescriptor.Type;

/**
 * Public trusted-app record: identity, URLs, support contacts, and offered scopes.
 *
 * Used when rendering install flows and resolving app metadata (mirrors the Zod
 * `trustedAppManifestSchema` in the main SDK protocol module).
 */
export const trustedAppManifest = Schema.Struct({
  /** Trusted app identifier. */
  id: Schema.NonEmptyString,
  /** URL-safe slug for routing and display. */
  slug: Schema.NonEmptyString,
  /** Human-readable app name. */
  displayName: Schema.NonEmptyString,
  /** Registration status in the trusted app catalog. */
  status: trustedAppStatus,
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
  scopes: Schema.Array(scopeDescriptor),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});
/** Inferred type for {@link trustedAppManifest}. */
export type TrustedAppManifest = typeof trustedAppManifest.Type;

/**
 * Payload to create an install intent: which target app, subject/org, scopes, and return URL.
 *
 * Corresponds to `createInstallIntentInputSchema` in the Zod protocol (timestamps encoded
 * as ISO strings there; here `expiresInSeconds` is a number as in the wire contract).
 */
export const createInstallIntentInput = Schema.Struct({
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
/** Inferred type for {@link createInstallIntentInput}. */
export type CreateInstallIntentInput = typeof createInstallIntentInput.Type;

/**
 * Server response after creating an install intent: ids, token, and URL to open the Connect UI.
 */
export const createInstallIntentResult = Schema.Struct({
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
/** Inferred type for {@link createInstallIntentResult}. */
export type CreateInstallIntentResult = typeof createInstallIntentResult.Type;
