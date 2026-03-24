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
