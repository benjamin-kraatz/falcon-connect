import { Context, Effect, Either, Schema } from "effect";
import { FALCON_CONNECT_API_ENDPOINTS } from "./constants";
import { decodeJwtUnsafeEffect, verifyConnectionAccessTokenEffect } from "./crypto";
import {
  FalconConnectSignedRequestError,
  InvalidIntentTokenError,
  VerifyConnectionTokenError,
} from "./errors";
import {
  ConnectionAccessTokenClaims,
  ConnectionRecord,
  DecideInstallIntentInput,
  DecideInstallIntentResult,
  FindIncomingConnectionInput,
  IntrospectConnectionInput,
  IntrospectionResult,
  ResolvedInstallIntent,
  ResolveInstallIntentInput,
  UpdateConnectionStatusInput,
} from "./protocol";
import {
  type FalconConnectSignedHttpConfig,
  signedJsonRequest,
  signedJsonRequestNullableConnection,
} from "./signedHttp";
import { AppId, IntentToken } from "./types";
import { normalizeGrantedScopes } from "./ui";

/**
 * Runtime schema branch for a signing key: either a JSON string or a plain object.
 * Validation is shallow (not a full JWK structural check).
 */
const privateJwk = Schema.Union(
  Schema.Record({ key: Schema.String, value: Schema.Any }),
  Schema.String,
);

/**
 * Effect `Schema` for {@link FalconConnectTargetClientOptions} (decoded shape used by the target service).
 *
 * @see {@link FalconConnectTargetClientOptions} — TypeScript type with refined `privateJwk` / `fetch`.
 */
export const FalconConnectTargetClientOptions = Schema.Struct({
  baseUrl: Schema.URL,
  appId: AppId,
  keyId: Schema.String,
  privateJwk,
  /**
   * Injected fetch implementation (optional). If omitted, the global `fetch` is used.
   *
   * The schema only verifies that the value is a `Function` when present. Callers should pass
   * the same `fetch` they rely on at runtime (for example `globalThis.fetch` in browsers or Workers).
   */
  fetch: Schema.optional(Schema.instanceOf(Function)),
});

/**
 * Options for the Falcon Connect **target** client (the trusted app calling the Connect HTTP API).
 *
 * Mirrors the decoded type of {@link FalconConnectTargetClientOptions} (the schema above), with
 * **`privateJwk`** and **`fetch`** re-declared so TypeScript matches downstream APIs:
 *
 * - **`privateJwk`** — `JsonWebKey` or a string of JSON (what `createFalconAppAuthHeaders` in `./crypto`
 *   expects). The schema still only validates “string or object”, not every JWK field.
 * - **`fetch`** — `typeof fetch` so request calls are typed as the standard Fetch API. The
 *   schema still only checks for an optional `Function`.
 */
export type FalconConnectTargetClientOptions = Omit<
  typeof FalconConnectTargetClientOptions.Type,
  "privateJwk" | "fetch"
> & {
  privateJwk: JsonWebKey | string;
  fetch?: typeof fetch;
};

/**
 * Maps target client options into the shared signed-HTTP config (drops `undefined` optional `fetch`
 * so `exactOptionalPropertyTypes` stays satisfied).
 */
function toSignedConfig(options: FalconConnectTargetClientOptions): FalconConnectSignedHttpConfig {
  const base: FalconConnectSignedHttpConfig = {
    baseUrl: options.baseUrl,
    appId: options.appId,
    keyId: options.keyId,
    privateJwk: options.privateJwk,
  };
  return options.fetch !== undefined ? { ...base, fetch: options.fetch } : base;
}

/**
 * Shape of the Falcon Connect **target** API exposed as Effect programs.
 *
 * Covers the trusted-app HTTP surface: install intent resolution and decisions, connection
 * introspection, incoming connection lookup, status updates, and optional local JWT verification
 * with introspection fallback.
 */
export interface FalconConnectTargetServiceDef {
  /**
   * Resolves an install intent token to server-backed install intent details.
   *
   * Calls `POST /v1/install-intents/resolve`. The `intentToken` is validated against
   * {@link ResolveInstallIntentInput}; the response is decoded as {@link ResolvedInstallIntent}.
   *
   * @param intentToken - Opaque token identifying the pending install intent.
   *
   * @returns An effect that succeeds with the resolved intent, or fails with
   * {@link InvalidIntentTokenError} if the token shape is invalid, or {@link FalconConnectSignedRequestError}
   * (with `operation: "resolveInstallIntent"`) for HTTP, signing, or response decode failures.
   */
  resolveInstallIntent: (
    intentToken: IntentToken,
  ) => Effect.Effect<
    ResolvedInstallIntent,
    InvalidIntentTokenError | FalconConnectSignedRequestError
  >;

  /**
   * Approves the install intent with optional scope selection (convenience over {@link submitInstallIntentDecision}).
   *
   * Builds a {@link DecideInstallIntentInput} with `approved: true`, `grantedScopes` from
   * {@link normalizeGrantedScopes}, then calls `POST /v1/install-intents/decision` and decodes
   * {@link DecideInstallIntentResult}.
   *
   * @param input.intent - Resolved intent (for scope metadata and normalization).
   * @param input.intentToken - Same token passed to {@link resolveInstallIntent}.
   * @param input.selectedScopeNames - Optional subset of scope names; defaults follow intent `selected` flags.
   */
  approveInstallIntent: (input: {
    intent: ResolvedInstallIntent;
    intentToken: IntentToken;
    selectedScopeNames?: ReadonlyArray<string>;
  }) => Effect.Effect<DecideInstallIntentResult, FalconConnectSignedRequestError>;

  /**
   * Submits a full approve/deny decision for an install intent.
   *
   * Calls `POST /v1/install-intents/decision` with a validated {@link DecideInstallIntentInput}.
   */
  submitInstallIntentDecision: (
    input: DecideInstallIntentInput,
  ) => Effect.Effect<DecideInstallIntentResult, FalconConnectSignedRequestError>;

  /**
   * Introspects a connection by id and/or connection token.
   *
   * Calls `POST /v1/connections/introspect` and decodes {@link IntrospectionResult}.
   */
  introspectConnection: (
    input: IntrospectConnectionInput,
  ) => Effect.Effect<IntrospectionResult, FalconConnectSignedRequestError>;

  /**
   * Finds an incoming connection for this target app (by source app, subject, org).
   *
   * Calls `POST /v1/connections/incoming`. The API may return JSON `null` when no row exists; that
   * decodes to `null` rather than an error.
   */
  findIncomingConnection: (
    input: FindIncomingConnectionInput,
  ) => Effect.Effect<ConnectionRecord | null, FalconConnectSignedRequestError>;

  /**
   * Updates connection lifecycle status (active / paused / revoked).
   *
   * Calls `POST /v1/connections/status` and decodes {@link ConnectionRecord}.
   */
  updateConnectionStatus: (
    input: UpdateConnectionStatusInput,
  ) => Effect.Effect<ConnectionRecord, FalconConnectSignedRequestError>;

  /**
   * Verifies a connection access token: first via JWKS (`verifyConnectionAccessTokenEffect` in `crypto.ts`),
   * or when `allowIntrospectionFallback` is true and local verification fails, via
   * `decodeJwtUnsafeEffect` plus the signed `POST /v1/connections/introspect` path (same payload as
   * {@link introspectConnection}).
   *
   * This is **not** a signed Connect route; it composes crypto + optional HTTP introspection only.
   *
   * @param input.token - JWT or opaque token string from the connection handoff.
   * @param input.allowIntrospectionFallback - When true and local JWT verification fails, decode claims
   *   without verification and call introspection on the Connect API.
   */
  verifyConnectionToken: (input: {
    token: string;
    allowIntrospectionFallback?: boolean;
  }) => Effect.Effect<
    | { mode: "local"; result: ConnectionAccessTokenClaims }
    | { mode: "introspection"; result: IntrospectionResult },
    VerifyConnectionTokenError
  >;
}

/**
 * Context tag for target client configuration.
 *
 * Provide a layer that supplies {@link FalconConnectTargetClientOptions}: base URL, app id, signing
 * key material, and optional custom `fetch`.
 *
 * @see {@link FalconConnectTargetClientOptions}
 * @see {@link FalconConnectTargetService}
 */
export class FalconConnectTargetConfig extends Context.Tag(
  "@falcon/sdk/target/FalconConnectTargetConfig",
)<FalconConnectTargetConfig, FalconConnectTargetClientOptions>() {}

/**
 * Default Effect `Service` implementation of the Falcon Connect **target** client.
 *
 * Requires {@link FalconConnectTargetConfig} in context. The service value implements
 * {@link FalconConnectTargetServiceDef} (resolve/decide intents, introspect, find incoming, status,
 * verify token).
 *
 * @see {@link FalconConnectTargetServiceDef}
 * @see {@link FalconConnectTargetConfig}
 */
export class FalconConnectTargetService extends Effect.Service<FalconConnectTargetService>()(
  "@falcon/sdk/target/FalconConnectTargetService",
  {
    effect: Effect.gen(function* () {
      const config = yield* FalconConnectTargetConfig;
      const signed = toSignedConfig(config);

      const schema: FalconConnectTargetServiceDef = {
        resolveInstallIntent: (intentToken: IntentToken) =>
          Effect.gen(function* () {
            const body = yield* Schema.decodeUnknown(ResolveInstallIntentInput)({
              intentToken,
            }).pipe(Effect.mapError((cause) => new InvalidIntentTokenError({ cause })));
            return yield* signedJsonRequest(
              signed,
              "resolveInstallIntent",
              body,
              ResolvedInstallIntent,
              FALCON_CONNECT_API_ENDPOINTS.resolveInstallIntent,
            );
          }),

        approveInstallIntent: (input) =>
          Effect.gen(function* () {
            const body = yield* Schema.decodeUnknown(DecideInstallIntentInput)({
              approved: true,
              intentToken: String(input.intentToken),
              grantedScopes: normalizeGrantedScopes(input.intent, input.selectedScopeNames),
            }).pipe(
              Effect.mapError(
                (cause) =>
                  new FalconConnectSignedRequestError({
                    operation: "approveInstallIntent",
                    cause,
                  }),
              ),
            );
            return yield* signedJsonRequest(
              signed,
              "approveInstallIntent",
              body,
              DecideInstallIntentResult,
              FALCON_CONNECT_API_ENDPOINTS.installIntentDecision,
            );
          }),

        submitInstallIntentDecision: (input) =>
          Effect.gen(function* () {
            const body = yield* Schema.decodeUnknown(DecideInstallIntentInput)(input).pipe(
              Effect.mapError(
                (cause) =>
                  new FalconConnectSignedRequestError({
                    operation: "submitInstallIntentDecision",
                    cause,
                  }),
              ),
            );
            return yield* signedJsonRequest(
              signed,
              "submitInstallIntentDecision",
              body,
              DecideInstallIntentResult,
              FALCON_CONNECT_API_ENDPOINTS.installIntentDecision,
            );
          }),

        introspectConnection: (input) =>
          Effect.gen(function* () {
            const body = yield* Schema.decodeUnknown(IntrospectConnectionInput)(input).pipe(
              Effect.mapError(
                (cause) =>
                  new FalconConnectSignedRequestError({
                    operation: "introspectConnection",
                    cause,
                  }),
              ),
            );
            return yield* signedJsonRequest(
              signed,
              "introspectConnection",
              body,
              IntrospectionResult,
              FALCON_CONNECT_API_ENDPOINTS.introspectConnection,
            );
          }),

        findIncomingConnection: (input) =>
          Effect.gen(function* () {
            const body = yield* Schema.decodeUnknown(FindIncomingConnectionInput)(input).pipe(
              Effect.mapError(
                (cause) =>
                  new FalconConnectSignedRequestError({
                    operation: "findIncomingConnection",
                    cause,
                  }),
              ),
            );
            return yield* signedJsonRequestNullableConnection(
              signed,
              "findIncomingConnection",
              body,
              FALCON_CONNECT_API_ENDPOINTS.incomingConnection,
            );
          }),

        updateConnectionStatus: (input) =>
          Effect.gen(function* () {
            const body = yield* Schema.decodeUnknown(UpdateConnectionStatusInput)(input).pipe(
              Effect.mapError(
                (cause) =>
                  new FalconConnectSignedRequestError({
                    operation: "updateConnectionStatus",
                    cause,
                  }),
              ),
            );
            return yield* signedJsonRequest(
              signed,
              "updateConnectionStatus",
              body,
              ConnectionRecord,
              FALCON_CONNECT_API_ENDPOINTS.connectionStatus,
            );
          }),

        verifyConnectionToken: (input) =>
          Effect.gen(function* () {
            const baseUrlStr =
              typeof config.baseUrl === "string" ? config.baseUrl : config.baseUrl.toString();
            const jwksUrl = new URL("/.well-known/jwks.json", baseUrlStr).toString();
            const attempt = yield* Effect.either(
              verifyConnectionAccessTokenEffect({
                token: input.token,
                issuer: baseUrlStr,
                audience: String(config.appId),
                jwksUrl,
              }).pipe(Effect.map((result) => ({ mode: "local" as const, result }))),
            );
            if (Either.isRight(attempt)) {
              return attempt.right;
            }
            if (!input.allowIntrospectionFallback) {
              return yield* new VerifyConnectionTokenError({ cause: attempt.left });
            }
            const decoded = yield* decodeJwtUnsafeEffect(input.token).pipe(
              Effect.mapError((e) => new VerifyConnectionTokenError({ cause: e })),
            );
            const connectionId =
              typeof decoded.connectionId === "string" ? decoded.connectionId : undefined;
            const result = yield* signedJsonRequest(
              signed,
              "introspectConnection",
              {
                connectionId,
                connectionToken: input.token,
              },
              IntrospectionResult,
              FALCON_CONNECT_API_ENDPOINTS.introspectConnection,
            ).pipe(Effect.mapError((e) => new VerifyConnectionTokenError({ cause: e })));
            return { mode: "introspection" as const, result };
          }),
      };

      return schema;
    }),
  },
) {}
