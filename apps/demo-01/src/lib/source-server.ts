import {
  canonicalizeFalconAppRequest,
  createFalconAppAuthHeaders,
  createFalconConnectSourceClient,
  decodeJwtUnsafe,
  getPublicJwk,
  signFalconAppRequest,
  verifyConnectionAccessToken,
  verifyInstallIntentToken,
  type CreateInstallIntentResult,
  type IssueConnectionTokenResult,
} from "@falcon/sdk";

import { sourceDemoConfig } from "./config";

const SOURCE_PRIVATE_JWK = {
  crv: "Ed25519",
  d: "NjqP_iJJX-dycue8bwvu7iUZq_xJ_i3eLeTo1t2OeBU",
  x: "jRb4Sc7A4pKsWiBnjuJaFQ2b0aH-e4E7UyK5U1ZhHfM",
  kty: "OKP",
} satisfies JsonWebKey;

export type SourceSdkDiagnostics = {
  publicJwk: JsonWebKey;
  canonical: string;
  authHeaders: Record<string, string>;
  signedRequest: {
    timestamp: string;
    nonce: string;
    signature: string;
    canonical: string;
  };
  latestIntentVerification: {
    decoded: Record<string, {}>;
    verified: {
      kind: "falcon-connect-install-intent";
      intentId: string;
      sourceAppId: string;
      targetAppId: string;
    };
  } | null;
  latestConnectionVerification: {
    decoded: Record<string, {}>;
    verified: {
      kind: "falcon-connect-connection";
      connectionId: string;
      sourceAppId: string;
      targetAppId: string;
      falconSubjectId: string;
      organizationId: string;
      scopes: string[];
      jti: string;
      iss: string;
      aud: string;
      sub: string;
      iat: number;
      exp: number;
    };
  } | null;
};

export const sourceClient = createFalconConnectSourceClient({
  baseUrl: sourceDemoConfig.falconBaseUrl,
  appId: sourceDemoConfig.appId,
  keyId: sourceDemoConfig.keyId,
  privateJwk: SOURCE_PRIVATE_JWK,
});

export async function buildSourceSdkDiagnostics(input: {
  connectionId?: string | null | undefined;
  latestIntent?: CreateInstallIntentResult | null;
  latestToken?: IssueConnectionTokenResult | null;
}): Promise<SourceSdkDiagnostics> {
  const demoBody = JSON.stringify({
    projectId: "proj-rollout",
    serviceIds: ["svc-edge-api", "svc-routing-core"],
  });
  const runtimeUrl = `${sourceDemoConfig.targetBaseUrl}/api/runtime/incidents`;
  const [publicJwk, signedRequest, authHeaders, canonical] = await Promise.all([
    getPublicJwk(SOURCE_PRIVATE_JWK),
    signFalconAppRequest({
      appId: sourceDemoConfig.appId,
      keyId: sourceDemoConfig.keyId,
      privateJwk: SOURCE_PRIVATE_JWK,
      method: "POST",
      url: runtimeUrl,
      body: demoBody,
    }),
    createFalconAppAuthHeaders({
      appId: sourceDemoConfig.appId,
      keyId: sourceDemoConfig.keyId,
      privateJwk: SOURCE_PRIVATE_JWK,
      method: "POST",
      url: runtimeUrl,
      body: demoBody,
    }),
    canonicalizeFalconAppRequest({
      appId: sourceDemoConfig.appId,
      keyId: sourceDemoConfig.keyId,
      method: "POST",
      url: runtimeUrl,
      body: demoBody,
      timestamp: new Date("2026-03-23T10:00:00.000Z").toISOString(),
      nonce: "falcon-source-demo-nonce",
    }),
  ]);

  const latestIntentVerification = input.latestIntent
    ? {
        decoded: decodeJwtUnsafe(input.latestIntent.intentToken) as Record<string, {}>,
        verified: await verifyInstallIntentToken({
          token: input.latestIntent.intentToken,
          issuer: sourceDemoConfig.falconBaseUrl,
          audience: sourceDemoConfig.targetAppId,
          jwksUrl: `${sourceDemoConfig.falconBaseUrl}/.well-known/jwks.json`,
        }),
      }
    : null;

  const latestConnectionVerification = input.latestToken
    ? {
        decoded: decodeJwtUnsafe(input.latestToken.token) as Record<string, {}>,
        verified: await verifyConnectionAccessToken({
          token: input.latestToken.token,
          issuer: sourceDemoConfig.falconBaseUrl,
          audience: sourceDemoConfig.targetAppId,
          jwksUrl: `${sourceDemoConfig.falconBaseUrl}/.well-known/jwks.json`,
        }),
      }
    : null;

  return {
    publicJwk,
    canonical,
    authHeaders,
    signedRequest,
    latestIntentVerification,
    latestConnectionVerification,
  };
}
