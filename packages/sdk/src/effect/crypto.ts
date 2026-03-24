import { Effect, ParseResult, Schema } from "effect";
import { importJWK } from "jose";
import { FALCON_APP_AUTH_HEADERS } from "./constants";
import {
  OkpKeyImportError,
  RequestPayloadCanonicalizationError,
  RequestPayloadSigningError,
  Sha256Base64UrlError,
} from "./errors";

/**
 * A JSON Web Key object or its JSON string form, used when importing OKP (Ed25519) keys.
 */
type SupportedJwk = JsonWebKey | string;

/** UTF-8 encoder for hashing and signing string payloads with the Web Crypto API. */
const encoder = new TextEncoder();

/**
 * Encodes binary data as a Base64URL string (no padding), suitable for JWS and header values.
 *
 * @param buffer - Raw bytes to encode.
 * @returns Base64URL-encoded string.
 */
function toBase64Url(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Decodes a Base64URL string into raw bytes.
 *
 * @param value - Base64URL-encoded input (no padding).
 * @returns Decoded bytes as a `Uint8Array`.
 */
function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

/**
 * Parses a supported JWK input into a {@link JsonWebKey} object.
 *
 * @param value - Either a parsed JWK object or a JSON string containing one.
 * @returns The parsed `JsonWebKey`. String input is parsed with `JSON.parse` (caller must ensure valid JSON).
 */
export function parseJwk(value: SupportedJwk): JsonWebKey {
  if (typeof value === "string") {
    return JSON.parse(value) as JsonWebKey;
  }

  return value;
}

/**
 * Imports an Ed25519 private or public JWK as a {@link CryptoKey} for the given operation.
 *
 * Uses `jose`'s `importJWK`. The JWK's `alg` field defaults to `"EdDSA"` when omitted.
 * Signing keys are imported non-extractable when `usage` is `"sign"`.
 *
 * @param jwk - Key material as object or JSON string.
 * @param usage - `"sign"` for private keys, `"verify"` for public keys.
 * @returns An Effect that succeeds with a `CryptoKey`, or fails with {@link OkpKeyImportError}.
 */
const importOkpKey = Effect.fn("importOkpKey")(function* (
  jwk: SupportedJwk,
  usage: "sign" | "verify",
) {
  const parsed = parseJwk(jwk);
  const algorithm = parsed.alg ?? "EdDSA";

  return yield* Effect.tryPromise({
    try: async () => {
      const key = await importJWK(
        parsed,
        algorithm,
        usage === "sign" ? { extractable: false } : {},
      );
      return key as CryptoKey;
    },
    catch: (cause) => new OkpKeyImportError({ cause }),
  });
});

/**
 * Computes SHA-256 over the UTF-8 encoding of `input` and returns the digest as Base64URL.
 *
 * @param input - Arbitrary string to hash.
 * @returns An Effect that succeeds with the Base64URL digest string, or fails with {@link Sha256Base64UrlError}.
 */
function sha256Base64Url(input: string) {
  return Effect.gen(function* () {
    const digest = yield* Effect.tryPromise({
      try: () => crypto.subtle.digest("SHA-256", encoder.encode(input)),
      catch: (cause) => new Sha256Base64UrlError({ cause }),
    });
    return toBase64Url(digest);
  });
}

/**
 * Builds the HTTP header map for Falcon app request authentication.
 *
 * Header names come from {@link FALCON_APP_AUTH_HEADERS}: app id, key id, ISO timestamp, nonce,
 * and Ed25519 signature over the canonical request string produced by {@link signFalconAppRequest}.
 *
 * @param input.appId - Falcon application identifier.
 * @param input.keyId - Key identifier corresponding to the signing key.
 * @param input.privateJwk - Private OKP JWK used to sign the canonical payload.
 * @param input.method - HTTP method (e.g. `GET`, `POST`); canonicalization uppercases it.
 * @param input.url - Full request URL; path and query are used in the canonical string.
 * @param input.body - Optional raw body string; defaults to empty string for hashing.
 * @returns An Effect that resolves to a plain object suitable for merging into request headers.
 */
export const createFalconAppAuthHeaders = Effect.fn("createFalconAppAuthHeaders")(
  function* (input: {
    appId: string;
    keyId: string;
    privateJwk: SupportedJwk;
    method: string;
    url: string;
    body?: string;
  }) {
    const signed = yield* signFalconAppRequest(input);

    return {
      [FALCON_APP_AUTH_HEADERS.appId]: input.appId,
      [FALCON_APP_AUTH_HEADERS.keyId]: input.keyId,
      [FALCON_APP_AUTH_HEADERS.timestamp]: signed.timestamp,
      [FALCON_APP_AUTH_HEADERS.nonce]: signed.nonce,
      [FALCON_APP_AUTH_HEADERS.signature]: signed.signature,
    };
  },
);

/**
 * Signs a Falcon app HTTP request using Ed25519 over a deterministic canonical representation.
 *
 * The canonical string (see {@link canonicalizeFalconAppRequest}) includes method, path+query,
 * SHA-256 hash of the body (Base64URL), app id, key id, timestamp, and nonce. The signature is
 * Base64URL-encoded raw Ed25519 bytes suitable for the `x-falcon-signature` header.
 *
 * @param input.appId - Falcon application identifier.
 * @param input.keyId - Key identifier for the signing key.
 * @param input.privateJwk - Private OKP JWK for Ed25519 signing.
 * @param input.method - HTTP method as sent (canonical form uses uppercase).
 * @param input.url - Request URL; must be parseable by the `URL` constructor.
 * @param input.body - Optional body string; defaults to `""` and is hashed for the canonical line.
 * @param input.timestamp - Optional ISO 8601 timestamp; defaults to `new Date().toISOString()`.
 * @param input.nonce - Optional unique nonce; defaults to `crypto.randomUUID()`.
 * @returns An Effect with `timestamp`, `nonce`, `signature` (Base64URL), and the `canonical` string that was signed.
 *
 * @remarks
 * Failures:
 * - {@link OkpKeyImportError} if the JWK cannot be imported.
 * - {@link RequestPayloadCanonicalizationError} if URL parsing or body hashing / schema decode fails.
 * - {@link RequestPayloadSigningError} if `crypto.subtle.sign` fails.
 */
export const signFalconAppRequest = Effect.fn("signFalconAppRequest")(function* (input: {
  appId: string;
  keyId: string;
  privateJwk: SupportedJwk;
  method: string;
  url: string;
  body?: string;
  timestamp?: string;
  nonce?: string;
}) {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const nonce = input.nonce ?? crypto.randomUUID();
  const body = input.body ?? "";
  const key = yield* importOkpKey(input.privateJwk, "sign");

  const canonical = yield* canonicalizeFalconAppRequest({
    appId: input.appId,
    keyId: input.keyId,
    method: input.method,
    url: input.url,
    body,
    timestamp,
    nonce,
  }).pipe(
    Effect.mapError((cause) => {
      return new RequestPayloadCanonicalizationError({ input: input, cause });
    }),
  );

  const signature = yield* Effect.tryPromise({
    try: () => crypto.subtle.sign("Ed25519", key, encoder.encode(canonical)),
    catch: (cause) => new RequestPayloadSigningError({ cause }),
  });

  return {
    timestamp,
    nonce,
    signature: toBase64Url(signature),
    canonical,
  };
});

/**
 * Schema for the structured input to Falcon app request canonicalization.
 *
 * All fields are required strings; the canonical string is derived from them (method uppercased,
 * URL parsed for path+search, body hashed).
 */
export const FalconAppRequestCanonicalInput = Schema.Struct({
  appId: Schema.String,
  keyId: Schema.String,
  method: Schema.String,
  url: Schema.String,
  body: Schema.String,
  timestamp: Schema.String,
  nonce: Schema.String,
});

/**
 * Inferred TypeScript type for a value that satisfies {@link FalconAppRequestCanonicalInput}.
 */
export type FalconAppRequestCanonicalInput = typeof FalconAppRequestCanonicalInput.Type;

/**
 * Decodes structured request fields into the single-line canonical string used for signing.
 *
 * Encode (reverse) is intentionally unsupported and always fails with a parse error, since the
 * mapping from canonical string back to fields is not bijective.
 */
const FalconAppRequestCanonical = Schema.transformOrFail(
  FalconAppRequestCanonicalInput,
  Schema.String,
  {
    decode: (input) => {
      return Effect.gen(function* () {
        const requestUrl = yield* Effect.try({
          try: () => new URL(input.url),
          catch: () => {
            return new ParseResult.Type(
              Schema.String.ast,
              input.url,
              "Invalid URL. Cannot canonicalize Falcon app request.",
            );
          },
        });
        const bodyHash = yield* sha256Base64Url(input.body).pipe(
          Effect.mapError(
            () =>
              new ParseResult.Type(
                Schema.String.ast,
                input.body,
                "Failed to compute request body hash",
              ),
          ),
        );
        return [
          input.method.toUpperCase(),
          `${requestUrl.pathname}${requestUrl.search}`,
          bodyHash,
          input.appId,
          input.keyId,
          input.timestamp,
          input.nonce,
        ].join("\n");
      });
    },
    encode: (canonical) => {
      return Effect.fail(
        new ParseResult.Type(
          FalconAppRequestCanonicalInput.ast,
          canonical,
          "Falcon app request canonical string cannot be encoded back to input fields",
        ),
      );
    },
  },
);

/**
 * Produces the exact canonical string that must be signed for Falcon app authentication.
 *
 * Format (newline-separated, no trailing newline):
 * `METHOD`, `path+query`, `bodySha256Base64Url`, `appId`, `keyId`, `timestamp`, `nonce`.
 *
 * @param input - Structured request fields; typically built to match the outgoing HTTP request.
 * @returns An Effect that succeeds with the canonical string, or fails with Effect Schema parse errors
 * (invalid URL, body hash failure, or schema validation).
 */
export const canonicalizeFalconAppRequest = Effect.fn("canonicalizeFalconAppRequest")(
  (input: FalconAppRequestCanonicalInput) => {
    return Schema.decode(FalconAppRequestCanonical)(input);
  },
);
