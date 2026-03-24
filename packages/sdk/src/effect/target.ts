import { Context, Effect, Option, Schema } from "effect";
import type { DecideInstallIntentInput, IntrospectConnectionInput } from "../protocol";
import { FALCON_CONNECT_API_ENDPOINTS, FalconConnectApiEndpoint } from "./constants";
import { createFalconAppAuthHeaders } from "./crypto";
import {
  ErrorResponseJsonExtractionError,
  ErrorResponseTextExtractionError,
  HttpResponseError,
  OutputParseError,
  ResolveInstallIntentRequestError,
  SignedJsonRequestError,
  SignedRequestHeaderCreationError,
} from "./errors";
import { ResolvedInstallIntent, ResolveInstallIntentInput } from "./protocol";
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

/**
 * Union of JSON request bodies accepted by {@link signedJsonRequest} for signed Connect API routes
 * (install intents, connection introspection, etc.).
 */
type SignedJsonRequestBody =
  | DecideInstallIntentInput
  | IntrospectConnectionInput
  | ResolveInstallIntentInput;

/**
 * Sends a **signed** `POST` request to the Falcon Connect HTTP API and decodes the JSON response.
 *
 * Builds the request URL (`new URL(route, baseUrl)`), encodes the body as JSON, attaches Falcon app
 * auth headers from {@link createFalconAppAuthHeaders}, and sends the request with `fetch` (from
 * `config.fetch` or `globalThis.fetch`).
 *
 * **Request pipeline**
 *
 * 1. Resolve the absolute URL from `config.baseUrl` and `route`.
 * 2. Encode `input` as a JSON string with Effect’s `Schema.String` decoder (equivalent to
 *    `JSON.stringify` for typical objects; the string is what gets signed and sent).
 * 3. Create signed headers for `POST` with that body and URL.
 * 4. `POST` with `content-type: application/json` and the signed headers.
 * 5. On HTTP success (`response.ok`), parse JSON and validate with `outputSchema`.
 *
 * **Failure modes** (typed failures, not thrown exceptions)
 *
 * - {@link SignedRequestHeaderCreationError} — signing or header construction failed.
 * - {@link SignedJsonRequestError} — the `fetch` call itself failed (network, abort, etc.).
 * - {@link HttpResponseError} — non-2xx status; `body` is the response text (for debugging).
 * - {@link ErrorResponseTextExtractionError} — could not read error body text on non-2xx.
 * - {@link ErrorResponseJsonExtractionError} — could not parse JSON on success path.
 * - {@link OutputParseError} — response JSON did not match `outputSchema`.
 *
 * @typeParam TInput - Request body type; must be one of the signed JSON payload shapes.
 * @typeParam TOutput - Decoded success type from `outputSchema`.
 *
 * @param config - Target client options (base URL, app id, key id, private JWK, optional `fetch`).
 * @param input - Value encoded as the JSON request body (and included in the signature).
 * @param outputSchema - Effect `Schema` used to decode and validate the response JSON.
 * @param route - Path relative to `config.baseUrl` (e.g. `"/v1/install-intents/resolve"`).
 *
 * @returns An effect that succeeds with `TOutput` or fails with one of the errors above.
 *
 * @remarks
 * A future refactor may use Effect’s `HttpClient` instead of `fetch` directly; behavior should
 * remain equivalent for callers.
 */
const signedJsonRequest = Effect.fn("signedJsonRequest")(function* <
  TInput extends SignedJsonRequestBody,
  TOutput,
>(
  config: FalconConnectTargetClientOptions,
  input: TInput,
  outputSchema: Schema.Schema<TOutput, any, never>,
  route: FalconConnectApiEndpoint,
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

  return yield* Schema.decodeUnknown(outputSchema)(json).pipe(
    Effect.mapError((cause) => new OutputParseError({ cause })),
  );
});

/**
 * Shape of the Falcon Connect **target** API exposed as Effect programs.
 *
 * Covers the trusted-app HTTP surface (resolve / decide install intents, introspect connections,
 * etc.). Only {@link FalconConnectTargetServiceDef.resolveInstallIntent} is implemented today; other
 * endpoints are reserved for future work.
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
   * @returns An effect that succeeds with the resolved intent or fails with
   * {@link ResolveInstallIntentRequestError} (wrapping failures from {@link signedJsonRequest} or
   * validation). **Note:** invalid `intentToken` input currently surfaces as a defect via
   * `Effect.die` until validation errors are modeled explicitly.
   */
  resolveInstallIntent: (
    intentToken: string,
  ) => Effect.Effect<ResolvedInstallIntent, ResolveInstallIntentRequestError>;
  // approveInstallIntent: (input: {
  //   intent: ResolvedInstallIntent;
  //   intentToken: string;
  //   selectedScopeNames?: string[];
  // }) => Effect.Effect<DecideInstallIntentResult>;
  // submitInstallIntentDecision: (
  //   input: DecideInstallIntentInput,
  // ) => Effect.Effect<DecideInstallIntentResult>;
  // introspectConnection: (input: IntrospectConnectionInput) => Effect.Effect<IntrospectionResult>;
  // verifyConnectionToken: (input: {
  //   token: string;
  //   allowIntrospectionFallback?: boolean;
  // }) => Effect.Effect<void>;
}

/**
 * Configuration definition for {@link FalconConnectTargetClientOptions} when using
 * {@link FalconConnectTargetService}.
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
 * Default Effect service implementation of the Falcon Connect target client.
 *
 * Requires {@link FalconConnectTargetConfig} in context. Exposes
 * {@link FalconConnectTargetServiceDef} methods.
 *
 * @see {@link FalconConnectTargetServiceDef}
 * @see {@link FalconConnectTargetConfig}
 */
export class FalconConnectTargetService extends Effect.Service<FalconConnectTargetService>()(
  "@falcon/sdk/target/FalconConnectTargetService",
  {
    effect: Effect.gen(function* () {
      const config = yield* FalconConnectTargetConfig;
      const schema: FalconConnectTargetServiceDef = {
        resolveInstallIntent: (intentToken: string) => {
          return Effect.gen(function* () {
            const intentSchemaOpt = Schema.decodeOption(ResolveInstallIntentInput)({
              intentToken,
            });
            if (Option.isNone(intentSchemaOpt)) {
              // TODO: replace with proper error
              return yield* Effect.die(new Error("This error will be replaced"));
            }

            const intentSchema = intentSchemaOpt.value;

            return yield* signedJsonRequest<ResolveInstallIntentInput, ResolvedInstallIntent>(
              config,
              intentSchema,
              ResolvedInstallIntent,
              FALCON_CONNECT_API_ENDPOINTS.resolveInstallIntent,
            ).pipe(Effect.mapError((cause) => new ResolveInstallIntentRequestError({ cause })));
          });
        },
      };

      return schema;
    }),
  },
) {}
