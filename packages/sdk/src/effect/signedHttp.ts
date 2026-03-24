import { Effect, Schema } from "effect";
import type { FalconConnectApiEndpoint } from "./constants";
import { createFalconAppAuthHeaders } from "./crypto";
import {
  type FalconConnectSignedFailureCause,
  type FalconConnectSignedOperation,
  ErrorResponseJsonExtractionError,
  ErrorResponseTextExtractionError,
  FalconConnectSignedRequestError,
  HttpResponseError,
  OutputParseError,
  SignedJsonRequestError,
  SignedRequestHeaderCreationError,
} from "./errors";
import { ConnectionRecord } from "./protocol";
import type { AppId } from "./types";
import { FalconRequestUrl } from "./types";

const globalFetchFallback = () => globalThis.fetch as typeof fetch;

/**
 * JSON wire codec: encodes an arbitrary validated request body object to a UTF-8 JSON string and decodes
 * JSON text to `unknown`, using {@link Schema.parseJson} (structured `ParseResult` instead of raw
 * `JSON.stringify` / `JSON.parse` at call sites).
 */
const jsonWire = Schema.parseJson();

/**
 * Success body codec for “maybe null connection” endpoints (`find`, `incoming`): JSON text decodes to
 * `ConnectionRecord | null` in one step.
 */
const nullableConnectionJson = Schema.parseJson(Schema.NullOr(ConnectionRecord));

/**
 * Minimal configuration shared by target and source clients for signed `POST` JSON requests to the
 * Connect API.
 *
 * Built from the target/source client options types in `target.ts` / `source.ts` (see `toSignedConfig`)
 * with optional `fetch` omitted when `undefined`.
 */
export type FalconConnectSignedHttpConfig = {
  /** Connect API base URL (same origin used for `new URL(route, baseUrl)`). */
  baseUrl: string | URL;
  /** Calling trusted app id (included in signed headers). */
  appId: AppId;
  /** Key id for the signing key (included in signed headers). */
  keyId: string;
  /** Ed25519 private JWK used to sign the canonical request string. */
  privateJwk: JsonWebKey | string;
  /**
   * Optional `fetch` implementation. When omitted, `globalThis.fetch` is used (see implementation).
   */
  fetch?: typeof fetch;
};

/**
 * Wraps a primitive failure into {@link FalconConnectSignedRequestError} with the given operation label
 * (for debugging and typed narrowing).
 */
function failSigned(
  operation: FalconConnectSignedOperation,
  cause: FalconConnectSignedFailureCause,
) {
  return new FalconConnectSignedRequestError({ operation, cause });
}

/**
 * Sends a **signed** `POST` request to the Falcon Connect HTTP API and decodes the JSON response.
 *
 * Builds the request URL (`new URL(route, baseUrl)`), encodes the body with
 * `Schema.encode(Schema.parseJson())(bodyObject)` so the same bytes are signed and sent, attaches
 * Falcon app auth headers from {@link createFalconAppAuthHeaders}, and uses `fetch` from `config.fetch`
 * or `globalThis.fetch`.
 *
 * **Request pipeline**
 *
 * 1. Resolve the absolute URL from `config.baseUrl` and `route`.
 * 2. Encode `bodyObject` to a JSON string via the shared JSON wire codec (`Schema.parseJson()` encode path).
 * 3. Create signed headers for `POST` with that body and URL.
 * 4. `POST` with `content-type: application/json` and the signed headers.
 * 5. On HTTP success (`response.ok`), read `response.text()` and decode with
 *    `Schema.decodeUnknown(Schema.parseJson(outputSchema))(text)` so the wire JSON is validated in one step.
 *
 * **Failure modes** (typed failures, not thrown exceptions)
 *
 * Failures are surfaced as {@link FalconConnectSignedRequestError} with `operation` set to the argument
 * you passed, and `cause` one of:
 *
 * - {@link OutputParseError} — request body could not be encoded to JSON, or response text could not be decoded/parsed.
 * - {@link SignedRequestHeaderCreationError} — signing or header construction failed.
 * - {@link SignedJsonRequestError} — the `fetch` call itself failed (network, abort, etc.).
 * - {@link HttpResponseError} — non-2xx status; `body` is the response text (for debugging).
 * - {@link ErrorResponseTextExtractionError} — could not read error body text on non-2xx.
 * - {@link ErrorResponseJsonExtractionError} — could not read success response body text.
 *
 * @typeParam TOutput - Decoded success type from `outputSchema`.
 *
 * @param config - Signed HTTP config (base URL, app id, key id, private JWK, optional `fetch`).
 * @param operation - Label stored on {@link FalconConnectSignedRequestError} when this call fails.
 * @param bodyObject - Value already validated by the caller; encoded as the JSON request body (and included in the signature).
 * @param outputSchema - Effect `Schema` composed with {@link Schema.parseJson} to decode the response text.
 * @param route - Path relative to `config.baseUrl` (must be a {@link FalconConnectApiEndpoint} literal).
 *
 * @returns An effect that succeeds with `TOutput` or fails with {@link FalconConnectSignedRequestError}.
 *
 * @remarks
 * A future refactor may use Effect’s `HttpClient` instead of `fetch` directly; behavior should
 * remain equivalent for callers.
 */
export const signedJsonRequest = Effect.fn("signedJsonRequest")(function* <TOutput>(
  config: FalconConnectSignedHttpConfig,
  operation: FalconConnectSignedOperation,
  bodyObject: unknown,
  outputSchema: Schema.Schema<TOutput, any, never>,
  route: FalconConnectApiEndpoint,
) {
  const requestUrl = new URL(route, config.baseUrl);
  const body = yield* Schema.encode(jsonWire)(bodyObject).pipe(
    Effect.mapError((cause) => failSigned(operation, new OutputParseError({ cause }))),
  );

  const authHeaders = yield* createFalconAppAuthHeaders({
    appId: config.appId,
    keyId: config.keyId,
    privateJwk: config.privateJwk,
    method: "POST",
    url: requestUrl.toString(),
    body,
  }).pipe(
    Effect.mapError((cause) =>
      failSigned(
        operation,
        new SignedRequestHeaderCreationError({
          appId: config.appId,
          requestUrl: FalconRequestUrl.make(requestUrl),
          cause,
        }),
      ),
    ),
  );

  const response = yield* Effect.tryPromise({
    try: async () =>
      (await (config.fetch ?? globalFetchFallback())(requestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders,
        },
        body,
      })) as Response,
    catch: (cause) =>
      failSigned(
        operation,
        new SignedJsonRequestError({
          appId: config.appId,
          requestUrl: FalconRequestUrl.make(requestUrl),
          cause,
        }),
      ),
  });

  if (!response.ok) {
    const errorBody = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (cause) => failSigned(operation, new ErrorResponseTextExtractionError({ cause })),
    });
    return yield* failSigned(
      operation,
      new HttpResponseError({ status: response.status, body: errorBody }),
    );
  }

  const text = yield* Effect.tryPromise({
    try: () => response.text(),
    catch: (cause) => failSigned(operation, new ErrorResponseJsonExtractionError({ cause })),
  });

  return yield* Schema.decodeUnknown(Schema.parseJson(outputSchema))(text).pipe(
    Effect.mapError((cause) => failSigned(operation, new OutputParseError({ cause }))),
  );
});

/**
 * Same as {@link signedJsonRequest} for the request half, but the **success** JSON payload may be the
 * literal `null` (when the API has no matching connection). Non-null payloads decode as
 * {@link ConnectionRecord}.
 *
 * Uses `Schema.parseJson(Schema.NullOr(ConnectionRecord))` on the response body.
 *
 * @param config - Signed HTTP config.
 * @param operation - Label for {@link FalconConnectSignedRequestError}.
 * @param bodyObject - Request body (validated by caller).
 * @param route - API path (e.g. `/v1/connections/find` or `/v1/connections/incoming`).
 */
export const signedJsonRequestNullableConnection = Effect.fn("signedJsonRequestNullableConnection")(
  function* (
    config: FalconConnectSignedHttpConfig,
    operation: FalconConnectSignedOperation,
    bodyObject: unknown,
    route: FalconConnectApiEndpoint,
  ) {
    const requestUrl = new URL(route, config.baseUrl);
    const body = yield* Schema.encode(jsonWire)(bodyObject).pipe(
      Effect.mapError((cause) => failSigned(operation, new OutputParseError({ cause }))),
    );

    const authHeaders = yield* createFalconAppAuthHeaders({
      appId: config.appId,
      keyId: config.keyId,
      privateJwk: config.privateJwk,
      method: "POST",
      url: requestUrl.toString(),
      body,
    }).pipe(
      Effect.mapError((cause) =>
        failSigned(
          operation,
          new SignedRequestHeaderCreationError({
            appId: config.appId,
            requestUrl: FalconRequestUrl.make(requestUrl),
            cause,
          }),
        ),
      ),
    );

    const response = yield* Effect.tryPromise({
      try: async () =>
        (await (config.fetch ?? globalFetchFallback())(requestUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...authHeaders,
          },
          body,
        })) as Response,
      catch: (cause) =>
        failSigned(
          operation,
          new SignedJsonRequestError({
            appId: config.appId,
            requestUrl: FalconRequestUrl.make(requestUrl),
            cause,
          }),
        ),
    });

    if (!response.ok) {
      const errorBody = yield* Effect.tryPromise({
        try: () => response.text(),
        catch: (cause) => failSigned(operation, new ErrorResponseTextExtractionError({ cause })),
      });
      return yield* failSigned(
        operation,
        new HttpResponseError({ status: response.status, body: errorBody }),
      );
    }

    const text = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (cause) => failSigned(operation, new ErrorResponseJsonExtractionError({ cause })),
    });

    return yield* Schema.decodeUnknown(nullableConnectionJson)(text).pipe(
      Effect.mapError((cause) => failSigned(operation, new OutputParseError({ cause }))),
    );
  },
);
