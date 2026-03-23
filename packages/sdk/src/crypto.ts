import { decodeJwt, exportJWK, importJWK, jwtVerify, SignJWT, createRemoteJWKSet } from "jose";

import {
  connectionAccessTokenClaimsSchema,
  installIntentTokenClaimsSchema,
  type ConnectionAccessTokenClaims,
  type InstallIntentTokenClaims,
} from "./protocol";

export const FALCON_APP_AUTH_HEADERS = {
  appId: "x-falcon-app-id",
  keyId: "x-falcon-key-id",
  timestamp: "x-falcon-timestamp",
  nonce: "x-falcon-nonce",
  signature: "x-falcon-signature",
} as const;

export const DEFAULT_APP_REQUEST_TTL_SECONDS = 300;
export const DEFAULT_INSTALL_INTENT_TTL_SECONDS = 900;
export const DEFAULT_CONNECTION_TOKEN_TTL_SECONDS = 300;

type SupportedJwk = JsonWebKey | string;

const encoder = new TextEncoder();

function toBase64Url(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

export function parseJwk(value: SupportedJwk): JsonWebKey {
  if (typeof value === "string") {
    return JSON.parse(value) as JsonWebKey;
  }

  return value;
}

async function importOkpKey(jwk: SupportedJwk, usage: "sign" | "verify") {
  const parsed = parseJwk(jwk);
  const algorithm = parsed.alg ?? "EdDSA";

  return (await importJWK(
    parsed,
    algorithm,
    usage === "sign" ? { extractable: false } : {},
  )) as CryptoKey;
}

async function sha256Base64Url(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return toBase64Url(digest);
}

export async function canonicalizeFalconAppRequest(input: {
  appId: string;
  keyId: string;
  method: string;
  url: string;
  body: string;
  timestamp: string;
  nonce: string;
}) {
  const requestUrl = new URL(input.url);

  return [
    input.method.toUpperCase(),
    `${requestUrl.pathname}${requestUrl.search}`,
    await sha256Base64Url(input.body),
    input.appId,
    input.keyId,
    input.timestamp,
    input.nonce,
  ].join("\n");
}

export async function signFalconAppRequest(input: {
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
  const key = await importOkpKey(input.privateJwk, "sign");
  const canonical = await canonicalizeFalconAppRequest({
    appId: input.appId,
    keyId: input.keyId,
    method: input.method,
    url: input.url,
    body,
    timestamp,
    nonce,
  });
  const signature = await crypto.subtle.sign("Ed25519", key, encoder.encode(canonical));

  return {
    timestamp,
    nonce,
    signature: toBase64Url(signature),
    canonical,
  };
}

export async function verifyFalconAppRequest(input: {
  appId: string;
  keyId: string;
  publicJwk: SupportedJwk;
  method: string;
  url: string;
  body?: string;
  timestamp: string;
  nonce: string;
  signature: string;
}) {
  const key = await importOkpKey(input.publicJwk, "verify");
  const canonical = await canonicalizeFalconAppRequest({
    appId: input.appId,
    keyId: input.keyId,
    method: input.method,
    url: input.url,
    body: input.body ?? "",
    timestamp: input.timestamp,
    nonce: input.nonce,
  });

  return crypto.subtle.verify(
    "Ed25519",
    key,
    fromBase64Url(input.signature),
    encoder.encode(canonical),
  );
}

export async function createFalconAppAuthHeaders(input: {
  appId: string;
  keyId: string;
  privateJwk: SupportedJwk;
  method: string;
  url: string;
  body?: string;
}) {
  const signed = await signFalconAppRequest(input);

  return {
    [FALCON_APP_AUTH_HEADERS.appId]: input.appId,
    [FALCON_APP_AUTH_HEADERS.keyId]: input.keyId,
    [FALCON_APP_AUTH_HEADERS.timestamp]: signed.timestamp,
    [FALCON_APP_AUTH_HEADERS.nonce]: signed.nonce,
    [FALCON_APP_AUTH_HEADERS.signature]: signed.signature,
  };
}

async function signFalconJwt(input: {
  privateJwk: SupportedJwk;
  keyId: string;
  issuer: string;
  audience: string;
  subject: string;
  claims: Record<string, unknown>;
  expiresInSeconds: number;
}) {
  const key = await importOkpKey(input.privateJwk, "sign");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT(input.claims)
    .setProtectedHeader({ alg: "EdDSA", kid: input.keyId, typ: "JWT" })
    .setIssuer(input.issuer)
    .setAudience(input.audience)
    .setSubject(input.subject)
    .setIssuedAt(now)
    .setExpirationTime(now + input.expiresInSeconds)
    .setJti(crypto.randomUUID())
    .sign(key);
}

export async function signInstallIntentToken(input: {
  privateJwk: SupportedJwk;
  keyId: string;
  issuer: string;
  audience: string;
  claims: InstallIntentTokenClaims;
  expiresInSeconds?: number;
}) {
  return signFalconJwt({
    privateJwk: input.privateJwk,
    keyId: input.keyId,
    issuer: input.issuer,
    audience: input.audience,
    subject: input.claims.intentId,
    claims: input.claims,
    expiresInSeconds: input.expiresInSeconds ?? DEFAULT_INSTALL_INTENT_TTL_SECONDS,
  });
}

export async function signConnectionAccessToken(input: {
  privateJwk: SupportedJwk;
  keyId: string;
  issuer: string;
  audience: string;
  subject: string;
  claims: Omit<ConnectionAccessTokenClaims, "iss" | "aud" | "sub" | "iat" | "exp" | "jti">;
  expiresInSeconds?: number;
}) {
  return signFalconJwt({
    privateJwk: input.privateJwk,
    keyId: input.keyId,
    issuer: input.issuer,
    audience: input.audience,
    subject: input.subject,
    claims: input.claims,
    expiresInSeconds: input.expiresInSeconds ?? DEFAULT_CONNECTION_TOKEN_TTL_SECONDS,
  });
}

export function decodeJwtUnsafe(token: string) {
  return decodeJwt(token);
}

export async function getPublicJwk(privateJwk: SupportedJwk) {
  const parsed = parseJwk(privateJwk);

  if (parsed.kty === "OKP" && parsed.crv === "Ed25519" && parsed.x) {
    return {
      kty: parsed.kty,
      crv: parsed.crv,
      x: parsed.x,
    } satisfies JsonWebKey;
  }

  const key = await importOkpKey(privateJwk, "sign");
  const exported = await exportJWK(key);

  if (!exported.x || !exported.kty || !exported.crv) {
    throw new Error("Unable to derive a public JWK from the configured signing key");
  }

  return {
    kty: exported.kty,
    crv: exported.crv,
    x: exported.x,
  } satisfies JsonWebKey;
}

export async function verifyInstallIntentToken(input: {
  token: string;
  issuer: string;
  audience: string;
  jwksUrl: string;
}) {
  const keySet = createRemoteJWKSet(new URL(input.jwksUrl));
  const { payload } = await jwtVerify(input.token, keySet, {
    issuer: input.issuer,
    audience: input.audience,
  });

  return installIntentTokenClaimsSchema.parse(payload);
}

export async function verifyConnectionAccessToken(input: {
  token: string;
  issuer: string;
  audience: string;
  jwksUrl: string;
}) {
  const keySet = createRemoteJWKSet(new URL(input.jwksUrl));
  const { payload } = await jwtVerify(input.token, keySet, {
    issuer: input.issuer,
    audience: input.audience,
  });

  return connectionAccessTokenClaimsSchema.parse(payload);
}
