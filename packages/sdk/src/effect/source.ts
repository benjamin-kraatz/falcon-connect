import { Context, Effect, Schema } from "effect";
import { FALCON_CONNECT_API_ENDPOINTS } from "./constants";
import { FalconConnectSignedRequestError } from "./errors";
import {
  ConnectionRecord,
  CreateInstallIntentInput,
  CreateInstallIntentResult,
  FindConnectionInput,
  IssueConnectionTokenInput,
  IssueConnectionTokenResult,
  UpdateConnectionStatusInput,
} from "./protocol";
import {
  type FalconConnectSignedHttpConfig,
  signedJsonRequest,
  signedJsonRequestNullableConnection,
} from "./signedHttp";
import { AppId } from "./types";

/**
 * Runtime schema branch for a signing key: either a JSON string or a plain object.
 * Validation is shallow (not a full JWK structural check).
 */
const privateJwk = Schema.Union(
  Schema.Record({ key: Schema.String, value: Schema.Any }),
  Schema.String,
);

/**
 * Effect `Schema` for {@link FalconConnectSourceClientOptions} (decoded shape used by the source service).
 *
 * @see {@link FalconConnectSourceClientOptions} — TypeScript type with refined `privateJwk` / `fetch`.
 */
export const FalconConnectSourceClientOptions = Schema.Struct({
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
 * Options for the Falcon Connect **source** client (the app initiating installs and issuing tokens).
 *
 * Mirrors the decoded type of {@link FalconConnectSourceClientOptions} (the schema above), with
 * **`privateJwk`** and **`fetch`** re-declared so TypeScript matches downstream APIs:
 *
 * - **`privateJwk`** — `JsonWebKey` or a string of JSON (what `createFalconAppAuthHeaders` in `./crypto`
 *   expects). The schema still only validates “string or object”, not every JWK field.
 * - **`fetch`** — `typeof fetch` so request calls are typed as the standard Fetch API. The
 *   schema still only checks for an optional `Function`.
 */
export type FalconConnectSourceClientOptions = Omit<
  typeof FalconConnectSourceClientOptions.Type,
  "privateJwk" | "fetch"
> & {
  privateJwk: JsonWebKey | string;
  fetch?: typeof fetch;
};

/**
 * Maps source client options into the shared signed-HTTP config (drops `undefined` optional `fetch`
 * so `exactOptionalPropertyTypes` stays satisfied).
 */
function toSignedConfig(options: FalconConnectSourceClientOptions): FalconConnectSignedHttpConfig {
  const base: FalconConnectSignedHttpConfig = {
    baseUrl: options.baseUrl,
    appId: options.appId,
    keyId: options.keyId,
    privateJwk: options.privateJwk,
  };
  return options.fetch !== undefined ? { ...base, fetch: options.fetch } : base;
}

/**
 * Builds the source Connect API (`FalconConnectSourceServiceDef`) from options.
 * Use with `Effect.runPromise` on individual methods, or prefer
 * {@link FalconConnectSourceService} with a {@link FalconConnectSourceConfig} layer.
 */
export function makeFalconConnectSourceService(
  config: FalconConnectSourceClientOptions,
): FalconConnectSourceServiceDef {
  const signed = toSignedConfig(config);

  return {
    createInstallIntent: (input) =>
      Effect.gen(function* () {
        const body = yield* Schema.decodeUnknown(CreateInstallIntentInput)(input).pipe(
          Effect.mapError(
            (cause) =>
              new FalconConnectSignedRequestError({
                operation: "createInstallIntent",
                cause,
              }),
          ),
        );
        return yield* signedJsonRequest(
          signed,
          "createInstallIntent",
          body,
          CreateInstallIntentResult,
          FALCON_CONNECT_API_ENDPOINTS.createInstallIntent,
        );
      }),

    issueConnectionAccessToken: (input) =>
      Effect.gen(function* () {
        const body = yield* Schema.decodeUnknown(IssueConnectionTokenInput)(input).pipe(
          Effect.mapError(
            (cause) =>
              new FalconConnectSignedRequestError({
                operation: "issueConnectionAccessToken",
                cause,
              }),
          ),
        );
        return yield* signedJsonRequest(
          signed,
          "issueConnectionAccessToken",
          body,
          IssueConnectionTokenResult,
          FALCON_CONNECT_API_ENDPOINTS.connectionAccessToken,
        );
      }),

    findConnection: (input) =>
      Effect.gen(function* () {
        const body = yield* Schema.decodeUnknown(FindConnectionInput)(input).pipe(
          Effect.mapError(
            (cause) =>
              new FalconConnectSignedRequestError({
                operation: "findConnection",
                cause,
              }),
          ),
        );
        return yield* signedJsonRequestNullableConnection(
          signed,
          "findConnection",
          body,
          FALCON_CONNECT_API_ENDPOINTS.findConnection,
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

    parseInstallCallback,
  };
}

/**
 * Parses Falcon Connect query parameters from an install callback URL (redirect return).
 * Pure function — also exposed on {@link FalconConnectSourceService}.
 */
export function parseInstallCallback(url: string | URL) {
  const callbackUrl = url instanceof URL ? url : new URL(url);

  return {
    status: callbackUrl.searchParams.get("falcon_connect_status"),
    connectionId: callbackUrl.searchParams.get("falcon_connect_connection_id"),
    intentId: callbackUrl.searchParams.get("falcon_connect_intent_id"),
    reason: callbackUrl.searchParams.get("falcon_connect_reason"),
  };
}

/**
 * Shape of the Falcon Connect **source** API exposed as Effect programs.
 *
 * Covers creating install intents, issuing connection access tokens, finding connections, updating
 * status, and parsing redirect callback query parameters.
 */
export interface FalconConnectSourceServiceDef {
  /**
   * Creates a new install intent and returns the Connect UI URL and intent token.
   *
   * Calls `POST /v1/install-intents` and decodes {@link CreateInstallIntentResult}.
   */
  createInstallIntent: (
    input: CreateInstallIntentInput,
  ) => Effect.Effect<CreateInstallIntentResult, FalconConnectSignedRequestError>;

  /**
   * Issues a short-lived connection access token for an existing connection.
   *
   * Calls `POST /v1/connections/access-token` and decodes {@link IssueConnectionTokenResult}.
   */
  issueConnectionAccessToken: (
    input: IssueConnectionTokenInput,
  ) => Effect.Effect<IssueConnectionTokenResult, FalconConnectSignedRequestError>;

  /**
   * Looks up a connection by subject, org, and target app.
   *
   * Calls `POST /v1/connections/find`. The API may return JSON `null` when no row exists; that
   * decodes to `null` rather than an error.
   */
  findConnection: (
    input: FindConnectionInput,
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
   * Parses Falcon Connect query parameters from an install callback URL (redirect return).
   *
   * Pure function — does not perform I/O. Reads `falcon_connect_*` search params.
   *
   * @param url - Absolute URL or `URL` object pointing at your redirect handler.
   * @returns Extracted `status`, `connectionId`, `intentId`, and `reason` (each may be `null` if absent).
   */
  parseInstallCallback: (url: string | URL) => {
    status: string | null;
    connectionId: string | null;
    intentId: string | null;
    reason: string | null;
  };
}

/**
 * Context tag for source client configuration.
 *
 * Provide a layer that supplies {@link FalconConnectSourceClientOptions}: base URL, app id, signing
 * key material, and optional custom `fetch`.
 *
 * @see {@link FalconConnectSourceClientOptions}
 * @see {@link FalconConnectSourceService}
 */
export class FalconConnectSourceConfig extends Context.Tag(
  "@falcon/sdk/source/FalconConnectSourceConfig",
)<FalconConnectSourceConfig, FalconConnectSourceClientOptions>() {}

/**
 * Default Effect `Service` implementation of the Falcon Connect **source** client.
 *
 * Requires {@link FalconConnectSourceConfig} in context. The service value implements
 * {@link FalconConnectSourceServiceDef}.
 *
 * @see {@link FalconConnectSourceServiceDef}
 * @see {@link FalconConnectSourceConfig}
 */
export class FalconConnectSourceService extends Effect.Service<FalconConnectSourceService>()(
  "@falcon/sdk/source/FalconConnectSourceService",
  {
    effect: Effect.gen(function* () {
      const config = yield* FalconConnectSourceConfig;
      return makeFalconConnectSourceService(config);
    }),
  },
) {}
