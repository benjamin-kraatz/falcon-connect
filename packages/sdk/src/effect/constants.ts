import { Schema } from "effect";

/** Default expiration time for install intents in seconds. */
export const DEFAULT_INSTALL_INTENT_EXPIRATION_SECONDS = 600 as const;

/** Default required-by-default value for scopes. */
export const DEFAULT_SCOPE_REQUIRED_BY_DEFAULT = true as const;

/** HTTP header names for signed Falcon app requests (app id, key id, timestamp, nonce, signature). */
export const FALCON_APP_AUTH_HEADERS = {
  appId: "x-falcon-app-id",
  keyId: "x-falcon-key-id",
  timestamp: "x-falcon-timestamp",
  nonce: "x-falcon-nonce",
  signature: "x-falcon-signature",
} as const;

/** Default maximum age of an app-signed request in seconds before it is rejected. */
export const DEFAULT_APP_REQUEST_TTL_SECONDS = 300;

/** Default time-to-live for install intents in seconds. */
export const DEFAULT_INSTALL_INTENT_TTL_SECONDS = 900;

/** Default validity window for connection tokens in seconds. */
export const DEFAULT_CONNECTION_TOKEN_TTL_SECONDS = 300;

const resolveInstallIntentPath = "/v1/install-intents/resolve" as const;
const decideInstallIntentPath = "/v1/install-intents/decide" as const;
const introspectConnectionPath = "/v1/connections/introspect" as const;
const verifyConnectionTokenPath = "/v1/connections/verify" as const;

/**
 * Falcon Connect API paths relative to a base URL (literal union schema).
 */
export const FalconConnectApiEndpoint = Schema.Union(
  Schema.Literal(resolveInstallIntentPath),
  Schema.Literal(decideInstallIntentPath),
  Schema.Literal(introspectConnectionPath),
  Schema.Literal(verifyConnectionTokenPath),
);
/** A Falcon Connect API path string. */
export type FalconConnectApiEndpoint = typeof FalconConnectApiEndpoint.Type;

/** Named paths for {@link FalconConnectApiEndpoint}. */
export const FALCON_CONNECT_API_ENDPOINTS = {
  resolveInstallIntent: resolveInstallIntentPath,
  decideInstallIntent: decideInstallIntentPath,
  introspectConnection: introspectConnectionPath,
  verifyConnectionToken: verifyConnectionTokenPath,
} as const;
