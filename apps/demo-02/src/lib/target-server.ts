import {
  canonicalizeFalconAppRequest,
  createFalconAppAuthHeaders,
  createFalconConnectTargetClient,
  decodeJwtUnsafe,
  getPublicJwk,
  signFalconAppRequest,
  verifyFalconAppRequest,
} from "@falcon/sdk";

import { incidentCatalog, onCallRoster, runbookCatalog, serviceHealth } from "./demo-data";
import { targetDemoConfig } from "./config";

const TARGET_PRIVATE_JWK = {
  crv: "Ed25519",
  d: "iT1lYpdMc7prKXq07FXzmF-0KMN1jFDV6Qsqba_wuHs",
  x: "1eN1bf41sXSURTvYPlsa45-ZxMaNPPe5dW6QyBIaj7A",
  kty: "OKP",
} satisfies JsonWebKey;

export type TargetSdkDiagnostics = {
  publicJwk: JsonWebKey;
  signed: {
    timestamp: string;
    nonce: string;
    signature: string;
    canonical: string;
  };
  authHeaders: Record<string, string>;
  verified: boolean;
  canonical: string;
  latestIntentDecoded: Record<string, {}> | null;
  liveVerification: {
    mode: "local" | "introspection";
    result: Record<string, {}>;
  } | null;
};

export const targetClient = createFalconConnectTargetClient({
  baseUrl: targetDemoConfig.falconBaseUrl,
  appId: targetDemoConfig.appId,
  keyId: targetDemoConfig.keyId,
  privateJwk: TARGET_PRIVATE_JWK,
});

export async function verifyRuntimeRequest(request: Request, requiredScope: string) {
  const authHeader = request.headers.get("authorization");
  const mode = request.headers.get("x-demo-verification-mode") ?? "local";

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing bearer token");
  }

  const token = authHeader.slice("Bearer ".length);

  if (mode === "force-introspection") {
    const decoded = decodeJwtUnsafe(token);
    const introspection = await targetClient.introspectConnection({
      connectionId: typeof decoded.connectionId === "string" ? decoded.connectionId : undefined,
      connectionToken: token,
    });

    if (!introspection.active || !introspection.connection) {
      throw new Error(
        `Introspection rejected the connection: ${introspection.reason ?? "inactive"}`,
      );
    }

    const grantedScopes = introspection.connection.grantedScopes
      .filter((scope) => scope.selected)
      .map((scope) => scope.name);

    if (!grantedScopes.includes(requiredScope)) {
      throw new Error(`Connection is active but missing required scope ${requiredScope}`);
    }

    return {
      verification: {
        mode: "introspection",
        active: introspection.active,
        reason: introspection.reason,
        connection: introspection.connection,
        claims: decoded,
      },
      token,
    };
  }

  const verified = await targetClient.verifyConnectionToken({
    token,
    allowIntrospectionFallback: false,
  });

  if (verified.mode !== "local") {
    throw new Error("Expected local verification result for runtime request");
  }

  if (!verified.result.scopes.includes(requiredScope)) {
    throw new Error(`Verified token is missing required scope ${requiredScope}`);
  }

  return {
    verification: {
      mode: verified.mode,
      active: true,
      reason: null,
      claims: verified.result,
    },
    token,
  };
}

export async function buildTargetSdkDiagnostics(input: {
  latestIntentToken?: string | null | undefined;
  latestConnectionToken?: string | null | undefined;
}): Promise<TargetSdkDiagnostics> {
  const demoBody = JSON.stringify({
    connectionId: "demo-connection-id",
  });
  const requestUrl = `${targetDemoConfig.falconBaseUrl}/v1/connections/introspect`;
  const publicJwk = await getPublicJwk(TARGET_PRIVATE_JWK);
  const signed = await signFalconAppRequest({
    appId: targetDemoConfig.appId,
    keyId: targetDemoConfig.keyId,
    privateJwk: TARGET_PRIVATE_JWK,
    method: "POST",
    url: requestUrl,
    body: demoBody,
  });
  const authHeaders = await createFalconAppAuthHeaders({
    appId: targetDemoConfig.appId,
    keyId: targetDemoConfig.keyId,
    privateJwk: TARGET_PRIVATE_JWK,
    method: "POST",
    url: requestUrl,
    body: demoBody,
  });
  const verified = await verifyFalconAppRequest({
    appId: targetDemoConfig.appId,
    keyId: targetDemoConfig.keyId,
    publicJwk,
    method: "POST",
    url: requestUrl,
    body: demoBody,
    timestamp: signed.timestamp,
    nonce: signed.nonce,
    signature: signed.signature,
  });
  const canonical = await canonicalizeFalconAppRequest({
    appId: targetDemoConfig.appId,
    keyId: targetDemoConfig.keyId,
    method: "POST",
    url: requestUrl,
    body: demoBody,
    timestamp: signed.timestamp,
    nonce: signed.nonce,
  });

  const liveVerification = input.latestConnectionToken
    ? await targetClient.verifyConnectionToken({
        token: input.latestConnectionToken,
        allowIntrospectionFallback: true,
      })
    : null;

  return {
    publicJwk,
    signed,
    authHeaders,
    verified,
    canonical,
    latestIntentDecoded: input.latestIntentToken
      ? (decodeJwtUnsafe(input.latestIntentToken) as Record<string, {}>)
      : null,
    liveVerification: liveVerification
      ? {
          mode: liveVerification.mode,
          result: liveVerification.result as Record<string, {}>,
        }
      : null,
  };
}

export function selectIncidents(serviceIds: string[]) {
  return incidentCatalog.filter((entry) => serviceIds.includes(entry.serviceId));
}

export function selectServiceHealth(serviceIds: string[]) {
  return serviceHealth.filter((entry) => serviceIds.includes(entry.serviceId));
}

export function selectRoster(serviceIds: string[]) {
  return onCallRoster.filter((entry) => serviceIds.includes(entry.serviceId));
}

export function selectRunbooks(serviceIds: string[]) {
  return runbookCatalog.filter((entry) => serviceIds.includes(entry.serviceId));
}
