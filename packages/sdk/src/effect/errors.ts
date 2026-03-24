import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import type { AppId, FalconRequestUrl } from "./types";

/**
 * Which signed Connect HTTP operation failed, carried on {@link FalconConnectSignedRequestError.operation}.
 *
 * Distinct values for target vs source routes (for example `findConnection` vs `findIncomingConnection`).
 */
export type FalconConnectSignedOperation =
  | "resolveInstallIntent"
  | "approveInstallIntent"
  | "submitInstallIntentDecision"
  | "introspectConnection"
  | "findIncomingConnection"
  | "updateConnectionStatus"
  | "createInstallIntent"
  | "issueConnectionAccessToken"
  | "findConnection";

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

/**
 * Failure from a signed Connect HTTP call (all routes that use `signedJsonRequest` in `signedHttp.ts`).
 *
 * Inspect `operation` to see which API call failed; inspect `cause` for the underlying tagged error
 * (HTTP status, parse failure, network, etc.).
 */
export class FalconConnectSignedRequestError extends Data.TaggedError(
  "FalconConnectSignedRequestError",
)<{
  /** Which SDK operation produced this failure (same label passed to `signedJsonRequest`). */
  readonly operation: FalconConnectSignedOperation;
  /** Underlying failure (HTTP, signing, transport, or Effect `ParseError`). */
  cause:
    | HttpResponseError
    | OutputParseError
    | SignedRequestHeaderCreationError
    | SignedJsonRequestError
    | ErrorResponseTextExtractionError
    | ErrorResponseJsonExtractionError
    | ParseError;
}> {}

/**
 * The install intent token failed Effect Schema validation for `ResolveInstallIntentInput` (`protocol.ts`).
 *
 * Returned by `FalconConnectTargetService.resolveInstallIntent` when the branded `IntentToken` does not decode.
 */
export class InvalidIntentTokenError extends Data.TaggedError("InvalidIntentTokenError")<{
  /** Effect `ParseError` from `Schema.decodeUnknown(ResolveInstallIntentInput)`. */
  cause: ParseError;
}> {}

/**
 * JWT signature verification failed (`jwtVerify` from `jose`) or claims did not match `ConnectionAccessTokenClaims`.
 *
 * Used by `verifyConnectionAccessTokenEffect` in `crypto.ts`.
 */
export class JwtVerificationError extends Data.TaggedError("JwtVerificationError")<{
  cause: unknown;
}> {}

/**
 * Non-verifying decode of a JWT payload failed (`decodeJwt` threw).
 *
 * Used by `decodeJwtUnsafeEffect` in `crypto.ts`.
 */
export class JwtDecodeError extends Data.TaggedError("JwtDecodeError")<{
  cause: unknown;
}> {}

/**
 * Composite failure for `FalconConnectTargetServiceDef.verifyConnectionToken`: local verification,
 * unsafe decode for introspection, or the subsequent signed introspection request.
 */
export class VerifyConnectionTokenError extends Data.TaggedError("VerifyConnectionTokenError")<{
  cause: JwtVerificationError | JwtDecodeError | FalconConnectSignedRequestError;
}> {}

/** Union of possible `cause` values on {@link FalconConnectSignedRequestError}. */
export type FalconConnectSignedFailureCause =
  | HttpResponseError
  | OutputParseError
  | SignedRequestHeaderCreationError
  | SignedJsonRequestError
  | ErrorResponseTextExtractionError
  | ErrorResponseJsonExtractionError
  | ParseError;
