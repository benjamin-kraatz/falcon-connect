import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import type { AppId, FalconRequestUrl } from "./types";

/** Non-2xx response from the Connect HTTP API (body is the response text). */
export class HttpResponseError extends Data.TaggedError("HttpResponseError")<{
  status: number;
  body: string;
}> {}

/** Decoded JSON failed output schema validation. */
export class OutputParseError extends Data.TaggedError("OutputParseError")<{
  cause: unknown;
}> {}

/** Failed to sign the request payload using the private key. */
export class RequestPayloadCanonicalizationError extends Data.TaggedError(
  "RequestPayloadCanonicalizationError",
)<{
  input: unknown;
  cause: unknown;
}> {}

/** Failed to sign the request payload using the private key. */
export class RequestPayloadSigningError extends Data.TaggedError("RequestPayloadSigningError")<{
  cause: unknown;
}> {}

/**
 * Failure while computing SHA-256 digest or encoding it as Base64URL (e.g. `crypto.subtle.digest` error).
 *
 * @property cause - The underlying error from the Web Crypto API or environment.
 */
export class Sha256Base64UrlError extends Data.TaggedError("Sha256Base64UrlError")<{
  cause: unknown;
}> {}

/**
 * Failure while importing an Octet Key Pair (OKP / Ed25519) via `jose` for signing or verification.
 *
 * @property cause - The error raised by `importJWK` or the underlying crypto implementation.
 */
export class OkpKeyImportError extends Data.TaggedError("OkpKeyImportError")<{
  cause: unknown;
}> {}

/** Failed to create signed request headers for a Falcon app request. */
export class SignedRequestHeaderCreationError extends Data.TaggedError(
  "SignedRequestHeaderCreationError",
)<{
  appId: AppId;
  requestUrl: FalconRequestUrl;
  cause: unknown;
}> {}

/** Failed to send a signed JSON request to the Falcon Connect HTTP API. */
export class SignedJsonRequestError extends Data.TaggedError("SignedJsonRequestError")<{
  status?: number;
  appId: AppId;
  requestUrl?: FalconRequestUrl;
  headers?: Record<string, string>;
  body?: string;
  cause: unknown;
}> {}

/** Failed to extract the response text from a signed JSON request. */
export class ErrorResponseTextExtractionError extends Data.TaggedError(
  "ErrorResponseTextExtractionError",
)<{
  cause: unknown;
}> {}

/** Failed to extract the response JSON from a signed JSON request. */
export class ErrorResponseJsonExtractionError extends Data.TaggedError(
  "ErrorResponseJsonExtractionError",
)<{
  cause: unknown;
}> {}

export class ResolveInstallIntentRequestError extends Data.TaggedError(
  "ResolveInstallIntentRequestError",
)<{
  cause:
    | HttpResponseError
    | OutputParseError
    | SignedRequestHeaderCreationError
    | SignedJsonRequestError
    | ErrorResponseTextExtractionError
    | ErrorResponseJsonExtractionError
    | ParseError;
}> {}
