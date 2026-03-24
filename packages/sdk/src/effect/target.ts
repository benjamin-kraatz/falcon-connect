import { Effect, Schema } from "effect";
import type {
  DecideInstallIntentInput,
  IntrospectConnectionInput,
  ResolvedInstallIntent,
} from "../protocol";
import { createFalconAppAuthHeaders } from "./crypto";
import {
  ErrorResponseJsonExtractionError,
  ErrorResponseTextExtractionError,
  HttpResponseError,
  OutputParseError,
  SignedJsonRequestError,
  SignedRequestHeaderCreationError,
} from "./errors";
import { AppId, FalconRequestUrl } from "./types";

const globalFetchFallback = () => globalThis.fetch as typeof fetch;

/**
 * Runtime schema branch for a signing key: either a JSON string or a plain object.
 * Validation is shallow (not a full JWK structural check).
 */
const privateJwk = Schema.Union(
  Schema.Record({ key: Schema.String, value: Schema.Any }),
  Schema.String,
);

/**
 * Definition for target-client options.
 *
 * @see {@link FalconConnectTargetClientOptions}
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
   * the same `fetch` they rely on at runtime (e.g. `globalThis.fetch` in browsers or Workers).
   */
  fetch: Schema.optional(Schema.instanceOf(Function)),
});

/**
 * Options for the Falcon Connect **target** client (trusted app calling the Connect HTTP API).
 *
 * It is based on the decoded type of {@link FalconConnectTargetClientOptions} (the schema
 * value above), with **`privateJwk`** and **`fetch`** re-declared so TypeScript matches
 * downstream APIs:
 *
 * - **`privateJwk`** – `JsonWebKey` or a string of JSON (what `createFalconAppAuthHeaders` in
 *   `crypto` expects). The schema still only validates “string or object”, not every JWK field.
 * - **`fetch`** – `typeof fetch` so request calls are typed as the standard Fetch API. The
 *   schema still only checks for an optional `Function`.
 */
export type FalconConnectTargetClientOptions = Omit<
  typeof FalconConnectTargetClientOptions.Type,
  "privateJwk" | "fetch"
> & {
  privateJwk: JsonWebKey | string;
  fetch?: typeof fetch;
};

type SignedJsonRequestBody =
  | DecideInstallIntentInput
  | IntrospectConnectionInput
  | ResolvedInstallIntent;

const signedJsonRequest = Effect.fn("signedJsonRequest")(function* <
  TInput extends SignedJsonRequestBody,
  TOutput extends { parse: (value: unknown) => unknown },
>(
  config: FalconConnectTargetClientOptions,
  input: TInput,
  outputSchema: { parse: (value: unknown) => TOutput },
  route: string,
) {
  const requestUrl = new URL(route, config.baseUrl);
  const body = yield* Schema.decodeUnknownEither(Schema.String)(input);
  const authHeaders = yield* createFalconAppAuthHeaders({
    appId: config.appId,
    keyId: config.keyId,
    privateJwk: config.privateJwk,
    method: "POST",
    url: requestUrl.toString(),
    body,
  }).pipe(
    Effect.mapError((cause) => {
      return new SignedRequestHeaderCreationError({
        appId: config.appId,
        requestUrl: FalconRequestUrl.make(requestUrl),
        cause,
      });
    }),
  );

  // TODO: replace with Effect's HttpClient? This way we can also kill the fetch fallback struggling.
  const response = yield* Effect.tryPromise({
    try: async () => {
      return (await (config.fetch ?? globalFetchFallback())(requestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders,
        },
        body,
      })) as Response;
    },
    catch: (cause) => {
      return new SignedJsonRequestError({
        appId: config.appId,
        requestUrl: FalconRequestUrl.make(requestUrl),
        cause,
      });
    },
  });

  if (!response.ok) {
    const errorBody = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (cause) => new ErrorResponseTextExtractionError({ cause }),
    });
    return yield* new HttpResponseError({ status: response.status, body: errorBody });
  }

  const json = yield* Effect.tryPromise({
    try: () => response.json(),
    catch: (cause) => new ErrorResponseJsonExtractionError({ cause }),
  });

  return yield* Effect.try({
    try: () => outputSchema.parse(json),
    catch: (cause) => new OutputParseError({ cause }),
  });
});
