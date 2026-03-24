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
const installIntentDecisionPath = "/v1/install-intents/decision" as const;
const createInstallIntentPath = "/v1/install-intents" as const;
const introspectConnectionPath = "/v1/connections/introspect" as const;
const incomingConnectionPath = "/v1/connections/incoming" as const;
const connectionStatusPath = "/v1/connections/status" as const;
const connectionAccessTokenPath = "/v1/connections/access-token" as const;
const findConnectionPath = "/v1/connections/find" as const;

/**
 * Falcon Connect API paths relative to a base URL (literal union schema).
 */
export const FalconConnectApiEndpoint = Schema.Union(
  Schema.Literal(resolveInstallIntentPath),
  Schema.Literal(installIntentDecisionPath),
  Schema.Literal(createInstallIntentPath),
  Schema.Literal(introspectConnectionPath),
  Schema.Literal(incomingConnectionPath),
  Schema.Literal(connectionStatusPath),
  Schema.Literal(connectionAccessTokenPath),
  Schema.Literal(findConnectionPath),
);
/** A Falcon Connect API path string. */
export type FalconConnectApiEndpoint = typeof FalconConnectApiEndpoint.Type;

/**
 * Stable path constants for signed Connect HTTP calls (aligned with the Connect server routes).
 *
 * Use with `new URL(path, baseUrl)`; each value is a member of {@link FalconConnectApiEndpoint}.
 */
export const FALCON_CONNECT_API_ENDPOINTS = {
  /** `POST` — resolve install intent token to full intent payload. */
  resolveInstallIntent: resolveInstallIntentPath,
  /** `POST` — approve or deny install intent (`/decision`, not `/decide`). */
  installIntentDecision: installIntentDecisionPath,
  /** `POST` — create install intent (source app). */
  createInstallIntent: createInstallIntentPath,
  /** `POST` — introspect connection by id and/or token. */
  introspectConnection: introspectConnectionPath,
  /** `POST` — find incoming connection (target app). */
  incomingConnection: incomingConnectionPath,
  /** `POST` — update connection status (source or target). */
  connectionStatus: connectionStatusPath,
  /** `POST` — issue connection access token (source app). */
  connectionAccessToken: connectionAccessTokenPath,
  /** `POST` — find connection by subject/org/target (source app); may return JSON `null`. */
  findConnection: findConnectionPath,
} as const;
