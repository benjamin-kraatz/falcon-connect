import { db } from "@falcon/db";
import {
  connection,
  connectionAuditEvent,
  connectionScopeGrant,
  installIntent,
  trustedApp,
  trustedAppKey,
  trustedAppRequestNonce,
  trustedAppScope,
} from "@falcon/db/schema/connect";
import { env } from "@falcon/env/server";
import {
  FALCON_APP_AUTH_HEADERS,
  DEFAULT_APP_REQUEST_TTL_SECONDS,
  DEFAULT_CONNECTION_TOKEN_TTL_SECONDS,
  DEFAULT_INSTALL_INTENT_TTL_SECONDS,
  decodeJwtUnsafe,
  getPublicJwk,
  parseJwk,
  signConnectionAccessToken,
  signInstallIntentToken,
  verifyFalconAppRequest,
} from "@falcon/sdk";
import type {
  ConnectionRecord,
  CreateInstallIntentResult,
  DecideInstallIntentResult,
  InstallIntentRecord,
  IntrospectionResult,
  OpsOverview,
  ResolvedInstallIntent,
  TrustedAppManifest,
} from "@falcon/sdk";
import {
  connectionAccessTokenClaimsSchema,
  createInstallIntentInputSchema,
  decideInstallIntentInputSchema,
  findConnectionInputSchema,
  findIncomingConnectionInputSchema,
  installIntentRecordSchema,
  introspectConnectionInputSchema,
  issueConnectionTokenInputSchema,
  updateConnectionStatusInputSchema,
} from "@falcon/sdk";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { importJWK, jwtVerify } from "jose";

const DEV_FALCON_SIGNING_PRIVATE_JWK = {
  kty: "OKP",
  crv: "Ed25519",
  x: "62-_IbY0qb851LJUILYqiCsC7VpDtpvgDvM4DURTA_E",
  d: "uKNwMBu13QJWA182RmXxumx8EcSs_oKJemojXu56-dI",
} satisfies JsonWebKey;

const DEV_FALCON_SIGNING_KEY_ID = "falcon-connect-dev-1";
const DEMO_SOURCE_APP_ID = "project-hub-demo";
const DEMO_TARGET_APP_ID = "incident-ops-demo";

const DEMO_SOURCE_APP = {
  id: DEMO_SOURCE_APP_ID,
  slug: "project-hub-demo",
  displayName: "Project Hub Demo",
  connectRequestUrl: "http://localhost:4101/overview",
  dataApiBaseUrl: "http://localhost:4101/api/runtime",
  allowedRedirectUrls: ["http://localhost:4101/connect-flow/callback"],
  supportEmail: "project-hub-demo@falcon.local",
  supportUrl: "http://localhost:4101/mental-model",
  privateJwk: {
    crv: "Ed25519",
    d: "NjqP_iJJX-dycue8bwvu7iUZq_xJ_i3eLeTo1t2OeBU",
    x: "jRb4Sc7A4pKsWiBnjuJaFQ2b0aH-e4E7UyK5U1ZhHfM",
    kty: "OKP",
  } satisfies JsonWebKey,
  keyId: "project-hub-demo-key-1",
} as const;

const DEMO_TARGET_APP = {
  id: DEMO_TARGET_APP_ID,
  slug: "incident-ops-demo",
  displayName: "Incident Ops Demo",
  connectRequestUrl: "http://localhost:4102/connect-flow",
  dataApiBaseUrl: "http://localhost:4102/api/runtime",
  allowedRedirectUrls: ["http://localhost:4102/connect-flow"],
  supportEmail: "incident-ops-demo@falcon.local",
  supportUrl: "http://localhost:4102/mental-model",
  privateJwk: {
    crv: "Ed25519",
    d: "iT1lYpdMc7prKXq07FXzmF-0KMN1jFDV6Qsqba_wuHs",
    x: "1eN1bf41sXSURTvYPlsa45-ZxMaNPPe5dW6QyBIaj7A",
    kty: "OKP",
  } satisfies JsonWebKey,
  keyId: "incident-ops-demo-key-1",
  scopes: [
    {
      name: "read:app-info",
      displayName: "App metadata",
      description: "Falcon system scope used to display target app identity during verification.",
      requiredByDefault: true,
      system: true,
    },
    {
      name: "incidents:read",
      displayName: "Incident summaries",
      description: "Read active incidents and tie them back to project delivery risk.",
      requiredByDefault: true,
      system: false,
    },
    {
      name: "services:read",
      displayName: "Service health",
      description: "Read the live health state for services that projects depend on.",
      requiredByDefault: true,
      system: false,
    },
    {
      name: "oncall:read",
      displayName: "On-call roster",
      description: "Read the currently assigned responders for escalation handoffs.",
      requiredByDefault: false,
      system: false,
    },
    {
      name: "runbooks:read",
      displayName: "Runbooks",
      description: "Read suggested remediation runbooks for linked incidents.",
      requiredByDefault: false,
      system: false,
    },
  ],
} as const;

let demoTrustedAppsBootstrapPromise: Promise<void> | null = null;

type TrustedAppRow = typeof trustedApp.$inferSelect;
type TrustedAppScopeRow = typeof trustedAppScope.$inferSelect;
type TrustedAppKeyRow = typeof trustedAppKey.$inferSelect;
type InstallIntentRow = typeof installIntent.$inferSelect;
type ConnectionRow = typeof connection.$inferSelect;
type ConnectionScopeGrantRow = typeof connectionScopeGrant.$inferSelect;

export class FalconConnectError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FalconConnectError";
  }
}

export type AuthenticatedAppRequest = {
  app: TrustedAppManifest;
  key: TrustedAppKeyRow;
};

type DecisionScope = {
  name: string;
  displayName: string;
  description: string;
  required: boolean;
  system: boolean;
  selected: boolean;
};

function getFalconEnvValue(name: string) {
  return (env as Record<string, string | undefined>)[name];
}

function getFalconSigningPrivateJwk() {
  const raw = getFalconEnvValue("FALCON_CONNECT_SIGNING_PRIVATE_JWK");

  return raw ? parseJwk(raw) : DEV_FALCON_SIGNING_PRIVATE_JWK;
}

function getFalconSigningKeyId() {
  return getFalconEnvValue("FALCON_CONNECT_SIGNING_KEY_ID") ?? DEV_FALCON_SIGNING_KEY_ID;
}

function getFalconIssuer() {
  return (
    getFalconEnvValue("FALCON_CONNECT_SERVER_URL") ??
    getFalconEnvValue("VITE_SERVER_URL") ??
    env.BETTER_AUTH_URL
  );
}

function toIsoString(value: Date | number | null | undefined) {
  if (value == null) {
    return null;
  }

  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function parseJsonArray(value: string) {
  const parsed = JSON.parse(value) as unknown;

  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string")) {
    throw new FalconConnectError(500, "INVALID_JSON", "Stored JSON array is malformed");
  }

  return parsed;
}

function parseJsonObject(value: string) {
  const parsed = JSON.parse(value) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new FalconConnectError(500, "INVALID_JSON", "Stored JSON object is malformed");
  }

  return parsed as Record<string, unknown>;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

async function upsertTrustedAppDefinition(input: {
  id: string;
  slug: string;
  displayName: string;
  connectRequestUrl: string;
  dataApiBaseUrl: string;
  allowedRedirectUrls: string[];
  supportEmail: string | null;
  supportUrl: string | null;
}) {
  const existing = await getTrustedAppRow(input.id);

  if (!existing) {
    await db.insert(trustedApp).values({
      id: input.id,
      slug: input.slug,
      displayName: input.displayName,
      status: "active",
      connectRequestUrl: input.connectRequestUrl,
      dataApiBaseUrl: input.dataApiBaseUrl,
      allowedRedirectUrlsJson: serializeJson(input.allowedRedirectUrls),
      supportEmail: input.supportEmail,
      supportUrl: input.supportUrl,
    });
    return;
  }

  await db
    .update(trustedApp)
    .set({
      slug: input.slug,
      displayName: input.displayName,
      status: "active",
      connectRequestUrl: input.connectRequestUrl,
      dataApiBaseUrl: input.dataApiBaseUrl,
      allowedRedirectUrlsJson: serializeJson(input.allowedRedirectUrls),
      supportEmail: input.supportEmail,
      supportUrl: input.supportUrl,
      updatedAt: new Date(),
    })
    .where(eq(trustedApp.id, input.id));
}

async function upsertTrustedAppKeyDefinition(input: {
  appId: string;
  keyId: string;
  publicJwk: JsonWebKey;
}) {
  const existing = await getTrustedAppKeyRow(input.appId, input.keyId);

  if (!existing) {
    await db.insert(trustedAppKey).values({
      id: crypto.randomUUID(),
      appId: input.appId,
      keyId: input.keyId,
      algorithm: "EdDSA",
      publicJwkJson: serializeJson(input.publicJwk),
      status: "active",
    });
    return;
  }

  await db
    .update(trustedAppKey)
    .set({
      algorithm: "EdDSA",
      publicJwkJson: serializeJson(input.publicJwk),
      status: "active",
    })
    .where(eq(trustedAppKey.id, existing.id));
}

async function upsertTrustedAppScopeDefinitions(
  appId: string,
  scopes: ReadonlyArray<{
    name: string;
    displayName: string;
    description: string;
    requiredByDefault: boolean;
    system: boolean;
  }>,
) {
  const existingScopes = await getTrustedAppScopeRows(appId);
  const existingByName = new Map(existingScopes.map((scope) => [scope.scopeName, scope]));

  for (const scope of scopes) {
    const existing = existingByName.get(scope.name);

    if (!existing) {
      await db.insert(trustedAppScope).values({
        id: crypto.randomUUID(),
        appId,
        scopeName: scope.name,
        displayName: scope.displayName,
        description: scope.description,
        requiredByDefault: scope.requiredByDefault,
        systemScope: scope.system,
      });
      continue;
    }

    await db
      .update(trustedAppScope)
      .set({
        displayName: scope.displayName,
        description: scope.description,
        requiredByDefault: scope.requiredByDefault,
        systemScope: scope.system,
        updatedAt: new Date(),
      })
      .where(eq(trustedAppScope.id, existing.id));
  }
}

function serializeJson(value: unknown) {
  return JSON.stringify(value);
}

function buildCallbackUrl(returnUrl: string, params: Record<string, string | undefined | null>) {
  const url = new URL(returnUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function ensure(
  condition: unknown,
  status: number,
  code: string,
  message: string,
): asserts condition {
  if (!condition) {
    throw new FalconConnectError(status, code, message);
  }
}

async function getTrustedAppRow(appId: string) {
  const [row] = await db.select().from(trustedApp).where(eq(trustedApp.id, appId)).limit(1);

  return row ?? null;
}

async function getTrustedAppScopeRows(appId: string) {
  return db
    .select()
    .from(trustedAppScope)
    .where(eq(trustedAppScope.appId, appId))
    .orderBy(trustedAppScope.scopeName);
}

async function mapTrustedAppManifestFromRow(row: TrustedAppRow): Promise<TrustedAppManifest> {
  const scopes = await getTrustedAppScopeRows(row.id);

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    status: row.status as TrustedAppManifest["status"],
    connectRequestUrl: row.connectRequestUrl,
    dataApiBaseUrl: row.dataApiBaseUrl,
    allowedRedirectUrls: parseJsonArray(row.allowedRedirectUrlsJson),
    supportEmail: row.supportEmail,
    supportUrl: row.supportUrl,
    scopes: scopes.map((scope) => ({
      name: scope.scopeName,
      displayName: scope.displayName,
      description: scope.description,
      requiredByDefault: scope.requiredByDefault,
      system: scope.systemScope,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getTrustedAppManifest(appId: string) {
  const row = await getTrustedAppRow(appId);

  if (!row) {
    return null;
  }

  return mapTrustedAppManifestFromRow(row);
}

async function getTrustedAppKeyRow(appId: string, keyId: string) {
  const [row] = await db
    .select()
    .from(trustedAppKey)
    .where(and(eq(trustedAppKey.appId, appId), eq(trustedAppKey.keyId, keyId)))
    .limit(1);

  return row ?? null;
}

async function insertAuditEvent(input: {
  connectionId?: string | null;
  installIntentId?: string | null;
  eventType: string;
  actorType: "system" | "source_app" | "target_app" | "dashboard_user";
  actorId?: string | null;
  payload?: Record<string, unknown>;
}) {
  await db.insert(connectionAuditEvent).values({
    id: crypto.randomUUID(),
    connectionId: input.connectionId ?? null,
    installIntentId: input.installIntentId ?? null,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    payloadJson: serializeJson(input.payload ?? {}),
  });
}

async function getConnectionScopeGrants(connectionId: string) {
  return db
    .select()
    .from(connectionScopeGrant)
    .where(eq(connectionScopeGrant.connectionId, connectionId))
    .orderBy(connectionScopeGrant.scopeName);
}

function mapConnectionRecord(
  row: ConnectionRow,
  grants: ConnectionScopeGrantRow[],
): ConnectionRecord {
  return {
    id: row.id,
    sourceAppId: row.sourceAppId,
    targetAppId: row.targetAppId,
    falconSubjectId: row.falconSubjectId,
    organizationId: row.organizationId,
    status: row.status as ConnectionRecord["status"],
    targetDataApiBaseUrl: row.targetDataApiBaseUrl,
    grantedScopes: grants.map((grant) => ({
      name: grant.scopeName,
      displayName: grant.displayName,
      description: grant.description,
      required: grant.required,
      system: grant.system,
      selected: grant.granted,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    activatedAt: toIsoString(row.activatedAt),
    pausedAt: toIsoString(row.pausedAt),
    revokedAt: toIsoString(row.revokedAt),
    revocationReason: row.revocationReason,
  };
}

function mapInstallIntentRecord(row: InstallIntentRow): InstallIntentRecord {
  return installIntentRecordSchema.parse({
    id: row.id,
    sourceAppId: row.sourceAppId,
    targetAppId: row.targetAppId,
    falconSubjectId: row.falconSubjectId,
    organizationId: row.organizationId,
    status: row.status,
    requestedScopes: parseJsonArray(row.requestedScopesJson),
    sourceReturnUrl: row.sourceReturnUrl,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function buildDecisionScopes(
  targetScopes: TrustedAppScopeRow[],
  requestedScopes: string[],
): DecisionScope[] {
  const requestedSet = new Set(requestedScopes);

  return targetScopes
    .filter((scope) => requestedSet.has(scope.scopeName) || scope.systemScope)
    .map((scope) => {
      const required = scope.requiredByDefault || scope.systemScope;

      return {
        name: scope.scopeName,
        displayName: scope.displayName,
        description: scope.description,
        required,
        system: scope.systemScope,
        selected: true,
      };
    });
}

async function upsertConnection(input: {
  intent: InstallIntentRow;
  targetApp: TrustedAppRow;
  scopes: DecisionScope[];
}) {
  const [existing] = await db
    .select()
    .from(connection)
    .where(
      and(
        eq(connection.sourceAppId, input.intent.sourceAppId),
        eq(connection.targetAppId, input.intent.targetAppId),
        eq(connection.falconSubjectId, input.intent.falconSubjectId),
        eq(connection.organizationId, input.intent.organizationId),
      ),
    )
    .limit(1);

  const now = new Date();

  if (existing) {
    await db
      .update(connection)
      .set({
        status: "active",
        targetDataApiBaseUrl: input.targetApp.dataApiBaseUrl,
        revocationReason: null,
        activatedAt: now,
        pausedAt: null,
        revokedAt: null,
        updatedAt: now,
      })
      .where(eq(connection.id, existing.id));

    await db.delete(connectionScopeGrant).where(eq(connectionScopeGrant.connectionId, existing.id));

    await db.insert(connectionScopeGrant).values(
      input.scopes.map((scope) => ({
        id: crypto.randomUUID(),
        connectionId: existing.id,
        scopeName: scope.name,
        displayName: scope.displayName,
        description: scope.description,
        required: scope.required,
        system: scope.system,
        granted: scope.selected,
      })),
    );

    const grants = await getConnectionScopeGrants(existing.id);

    return mapConnectionRecord(
      {
        ...existing,
        status: "active",
        targetDataApiBaseUrl: input.targetApp.dataApiBaseUrl,
        revocationReason: null,
        activatedAt: now,
        pausedAt: null,
        revokedAt: null,
        updatedAt: now,
      },
      grants,
    );
  }

  const connectionId = crypto.randomUUID();

  await db.insert(connection).values({
    id: connectionId,
    sourceAppId: input.intent.sourceAppId,
    targetAppId: input.intent.targetAppId,
    falconSubjectId: input.intent.falconSubjectId,
    organizationId: input.intent.organizationId,
    status: "active",
    targetDataApiBaseUrl: input.targetApp.dataApiBaseUrl,
    activatedAt: now,
  });

  await db.insert(connectionScopeGrant).values(
    input.scopes.map((scope) => ({
      id: crypto.randomUUID(),
      connectionId,
      scopeName: scope.name,
      displayName: scope.displayName,
      description: scope.description,
      required: scope.required,
      system: scope.system,
      granted: scope.selected,
    })),
  );

  const [created] = await db
    .select()
    .from(connection)
    .where(eq(connection.id, connectionId))
    .limit(1);
  const grants = await getConnectionScopeGrants(connectionId);

  ensure(created, 500, "CONNECTION_CREATE_FAILED", "Connection creation failed");

  return mapConnectionRecord(created, grants);
}

async function verifyInternalInstallIntentToken(token: string, audience: string) {
  const publicJwk = await getPublicJwk(getFalconSigningPrivateJwk());
  const key = await importJWK(publicJwk, "EdDSA");
  const { payload } = await jwtVerify(token, key, {
    issuer: getFalconIssuer(),
    audience,
  });

  return {
    intentId: String(payload.intentId),
    sourceAppId: String(payload.sourceAppId),
    targetAppId: String(payload.targetAppId),
    kind: String(payload.kind),
  };
}

function getScopeNamesFromGrants(grants: ConnectionScopeGrantRow[]) {
  return grants.filter((grant) => grant.granted).map((grant) => grant.scopeName);
}

export async function getFalconJwks() {
  const publicJwk = await getPublicJwk(getFalconSigningPrivateJwk());

  return {
    keys: [
      {
        ...publicJwk,
        alg: "EdDSA",
        use: "sig",
        kid: getFalconSigningKeyId(),
      },
    ],
  };
}

export async function ensureDemoTrustedAppsRegistered() {
  demoTrustedAppsBootstrapPromise ??= (async () => {
    const [sourcePublicJwk, targetPublicJwk] = await Promise.all([
      getPublicJwk(DEMO_SOURCE_APP.privateJwk),
      getPublicJwk(DEMO_TARGET_APP.privateJwk),
    ]);

    await Promise.all([
      upsertTrustedAppDefinition({
        id: DEMO_SOURCE_APP.id,
        slug: DEMO_SOURCE_APP.slug,
        displayName: DEMO_SOURCE_APP.displayName,
        connectRequestUrl: DEMO_SOURCE_APP.connectRequestUrl,
        dataApiBaseUrl: DEMO_SOURCE_APP.dataApiBaseUrl,
        allowedRedirectUrls: [...DEMO_SOURCE_APP.allowedRedirectUrls],
        supportEmail: DEMO_SOURCE_APP.supportEmail,
        supportUrl: DEMO_SOURCE_APP.supportUrl,
      }),
      upsertTrustedAppDefinition({
        id: DEMO_TARGET_APP.id,
        slug: DEMO_TARGET_APP.slug,
        displayName: DEMO_TARGET_APP.displayName,
        connectRequestUrl: DEMO_TARGET_APP.connectRequestUrl,
        dataApiBaseUrl: DEMO_TARGET_APP.dataApiBaseUrl,
        allowedRedirectUrls: [...DEMO_TARGET_APP.allowedRedirectUrls],
        supportEmail: DEMO_TARGET_APP.supportEmail,
        supportUrl: DEMO_TARGET_APP.supportUrl,
      }),
    ]);

    await Promise.all([
      upsertTrustedAppKeyDefinition({
        appId: DEMO_SOURCE_APP.id,
        keyId: DEMO_SOURCE_APP.keyId,
        publicJwk: sourcePublicJwk,
      }),
      upsertTrustedAppKeyDefinition({
        appId: DEMO_TARGET_APP.id,
        keyId: DEMO_TARGET_APP.keyId,
        publicJwk: targetPublicJwk,
      }),
      upsertTrustedAppScopeDefinitions(DEMO_TARGET_APP.id, DEMO_TARGET_APP.scopes),
    ]);
  })();

  await demoTrustedAppsBootstrapPromise;
}

export async function authenticateTrustedAppRequest(input: {
  method: string;
  url: string;
  headers: Headers;
  body?: string;
}): Promise<AuthenticatedAppRequest> {
  await ensureDemoTrustedAppsRegistered();

  const appId = input.headers.get(FALCON_APP_AUTH_HEADERS.appId);
  const keyId = input.headers.get(FALCON_APP_AUTH_HEADERS.keyId);
  const timestamp = input.headers.get(FALCON_APP_AUTH_HEADERS.timestamp);
  const nonce = input.headers.get(FALCON_APP_AUTH_HEADERS.nonce);
  const signature = input.headers.get(FALCON_APP_AUTH_HEADERS.signature);

  ensure(appId, 401, "APP_ID_REQUIRED", "Missing Falcon app authentication header");
  ensure(keyId, 401, "KEY_ID_REQUIRED", "Missing Falcon key id header");
  ensure(timestamp, 401, "TIMESTAMP_REQUIRED", "Missing Falcon timestamp header");
  ensure(nonce, 401, "NONCE_REQUIRED", "Missing Falcon nonce header");
  ensure(signature, 401, "SIGNATURE_REQUIRED", "Missing Falcon signature header");

  const requestTimestamp = Date.parse(timestamp);

  ensure(
    Number.isFinite(requestTimestamp),
    401,
    "TIMESTAMP_INVALID",
    "Falcon app authentication timestamp is invalid",
  );

  ensure(
    Math.abs(Date.now() - requestTimestamp) <= DEFAULT_APP_REQUEST_TTL_SECONDS * 1000,
    401,
    "TIMESTAMP_EXPIRED",
    "Falcon app authentication timestamp is outside the accepted skew",
  );

  const [appRow, keyRow] = await Promise.all([
    getTrustedAppRow(appId),
    getTrustedAppKeyRow(appId, keyId),
  ]);

  ensure(appRow, 401, "APP_UNKNOWN", "The trusted app is not registered");
  ensure(appRow.status === "active", 403, "APP_INACTIVE", "The trusted app is inactive");
  ensure(keyRow, 401, "KEY_UNKNOWN", "The trusted app key is not registered");
  ensure(keyRow.status === "active", 403, "KEY_INACTIVE", "The trusted app key is not active");

  const verified = await verifyFalconAppRequest({
    appId,
    keyId,
    publicJwk: keyRow.publicJwkJson,
    method: input.method,
    url: input.url,
    body: input.body ?? "",
    timestamp,
    nonce,
    signature,
  });

  ensure(verified, 401, "SIGNATURE_INVALID", "The Falcon app request signature is invalid");

  const [existingNonce] = await db
    .select()
    .from(trustedAppRequestNonce)
    .where(and(eq(trustedAppRequestNonce.appId, appId), eq(trustedAppRequestNonce.nonce, nonce)))
    .limit(1);

  ensure(
    !existingNonce,
    401,
    "NONCE_REPLAYED",
    "The Falcon app request nonce has already been used",
  );

  await db.insert(trustedAppRequestNonce).values({
    id: crypto.randomUUID(),
    appId,
    keyId,
    nonce,
    requestPath: new URL(input.url).pathname,
    expiresAt: new Date(Date.now() + DEFAULT_APP_REQUEST_TTL_SECONDS * 1000),
  });

  return {
    app: await mapTrustedAppManifestFromRow(appRow),
    key: keyRow,
  };
}

export async function createInstallIntent(
  auth: AuthenticatedAppRequest,
  rawInput: unknown,
): Promise<CreateInstallIntentResult> {
  const input = createInstallIntentInputSchema.parse(rawInput);
  const sourceAllowedRedirects = new Set(auth.app.allowedRedirectUrls);

  ensure(
    sourceAllowedRedirects.has(input.sourceReturnUrl),
    400,
    "RETURN_URL_NOT_ALLOWED",
    `The source return URL is not registered for this trusted app (${auth.app.id}): ${input.sourceReturnUrl}`,
  );

  const targetRow = await getTrustedAppRow(input.targetAppId);

  ensure(targetRow, 404, "TARGET_APP_NOT_FOUND", "The target app is not registered");
  ensure(targetRow.status === "active", 400, "TARGET_APP_INACTIVE", "The target app is inactive");

  const targetScopes = await getTrustedAppScopeRows(targetRow.id);
  const declaredScopeNames = new Set(targetScopes.map((scope) => scope.scopeName));
  const systemScopeNames = targetScopes
    .filter((scope) => scope.systemScope)
    .map((scope) => scope.scopeName);
  const requestedScopes = uniqueStrings([...input.requestedScopes, ...systemScopeNames]);

  ensure(
    requestedScopes.every((scope) => declaredScopeNames.has(scope)),
    400,
    "SCOPE_UNKNOWN",
    "One or more requested scopes are not declared by the target app",
  );

  const expiresAt = new Date(
    Date.now() + (input.expiresInSeconds ?? DEFAULT_INSTALL_INTENT_TTL_SECONDS) * 1000,
  );
  const intentId = crypto.randomUUID();

  await db.insert(installIntent).values({
    id: intentId,
    sourceAppId: auth.app.id,
    targetAppId: targetRow.id,
    falconSubjectId: input.falconSubjectId,
    organizationId: input.organizationId,
    requestedScopesJson: serializeJson(requestedScopes),
    sourceReturnUrl: input.sourceReturnUrl,
    status: "pending",
    expiresAt,
  });

  await insertAuditEvent({
    installIntentId: intentId,
    eventType: "install_intent.created",
    actorType: "source_app",
    actorId: auth.app.id,
    payload: {
      requestedScopes,
      organizationId: input.organizationId,
      falconSubjectId: input.falconSubjectId,
    },
  });

  const intentToken = await signInstallIntentToken(
    Object.assign(
      {
        privateJwk: getFalconSigningPrivateJwk(),
        keyId: getFalconSigningKeyId(),
        issuer: getFalconIssuer(),
        audience: targetRow.id,
        claims: {
          kind: "falcon-connect-install-intent" as const,
          intentId,
          sourceAppId: auth.app.id,
          targetAppId: targetRow.id,
        },
      },
      input.expiresInSeconds == null ? {} : { expiresInSeconds: input.expiresInSeconds },
    ),
  );

  const connectUrl = new URL(targetRow.connectRequestUrl);
  connectUrl.searchParams.set("falcon_connect_intent", intentToken);

  return {
    intentId,
    intentToken,
    connectUrl: connectUrl.toString(),
    expiresAt: expiresAt.toISOString(),
    sourceAppId: auth.app.id,
    targetAppId: targetRow.id,
    requestedScopes,
  };
}

export async function resolveInstallIntent(
  auth: AuthenticatedAppRequest,
  intentToken: string,
): Promise<ResolvedInstallIntent> {
  const verified = await verifyInternalInstallIntentToken(intentToken, auth.app.id);

  ensure(
    verified.kind === "falcon-connect-install-intent",
    400,
    "INTENT_TOKEN_INVALID",
    "The install intent token is invalid",
  );

  const [intentRow, targetRow, sourceManifest] = await Promise.all([
    db
      .select()
      .from(installIntent)
      .where(eq(installIntent.id, verified.intentId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getTrustedAppRow(auth.app.id),
    getTrustedAppManifest(verified.sourceAppId),
  ]);

  ensure(intentRow, 404, "INTENT_NOT_FOUND", "The install intent was not found");
  ensure(sourceManifest, 404, "SOURCE_APP_NOT_FOUND", "The source app was not found");
  ensure(targetRow, 404, "TARGET_APP_NOT_FOUND", "The target app was not found");
  ensure(
    intentRow.targetAppId === auth.app.id,
    403,
    "INTENT_TARGET_MISMATCH",
    "The install intent target app does not match the authenticated app",
  );

  if (intentRow.expiresAt.getTime() <= Date.now() && intentRow.status === "pending") {
    await db
      .update(installIntent)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(eq(installIntent.id, intentRow.id));

    throw new FalconConnectError(410, "INTENT_EXPIRED", "The install intent has expired");
  }

  ensure(
    intentRow.status === "pending",
    409,
    "INTENT_NOT_PENDING",
    "The install intent is not pending",
  );

  const targetScopes = await getTrustedAppScopeRows(auth.app.id);
  const requestedScopes = parseJsonArray(intentRow.requestedScopesJson);
  const scopes = buildDecisionScopes(targetScopes, requestedScopes);

  return {
    intentId: intentRow.id,
    status: intentRow.status as ResolvedInstallIntent["status"],
    sourceApp: {
      id: sourceManifest.id,
      slug: sourceManifest.slug,
      displayName: sourceManifest.displayName,
      dataApiBaseUrl: sourceManifest.dataApiBaseUrl,
      supportEmail: sourceManifest.supportEmail,
      supportUrl: sourceManifest.supportUrl,
    },
    targetApp: {
      id: auth.app.id,
      slug: auth.app.slug,
      displayName: auth.app.displayName,
      dataApiBaseUrl: auth.app.dataApiBaseUrl,
      supportEmail: auth.app.supportEmail,
      supportUrl: auth.app.supportUrl,
    },
    falconSubjectId: intentRow.falconSubjectId,
    organizationId: intentRow.organizationId,
    sourceReturnUrl: intentRow.sourceReturnUrl,
    scopes,
    expiresAt: intentRow.expiresAt.toISOString(),
  };
}

export async function decideInstallIntent(
  auth: AuthenticatedAppRequest,
  rawInput: unknown,
): Promise<DecideInstallIntentResult> {
  const input = decideInstallIntentInputSchema.parse(rawInput);
  const verified = await verifyInternalInstallIntentToken(input.intentToken, auth.app.id);
  const [intentRow, targetRow] = await Promise.all([
    db
      .select()
      .from(installIntent)
      .where(eq(installIntent.id, verified.intentId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getTrustedAppRow(auth.app.id),
  ]);

  ensure(intentRow, 404, "INTENT_NOT_FOUND", "The install intent was not found");
  ensure(targetRow, 404, "TARGET_APP_NOT_FOUND", "The target app was not found");
  ensure(
    intentRow.status === "pending",
    409,
    "INTENT_NOT_PENDING",
    "The install intent is not pending",
  );

  if (intentRow.expiresAt.getTime() <= Date.now()) {
    await db
      .update(installIntent)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(eq(installIntent.id, intentRow.id));

    return {
      status: "expired",
      connection: null,
      redirectUrl: buildCallbackUrl(intentRow.sourceReturnUrl, {
        falcon_connect_status: "expired",
        falcon_connect_intent_id: intentRow.id,
        falcon_connect_reason: "Install intent expired",
      }),
    };
  }

  const targetScopes = await getTrustedAppScopeRows(targetRow.id);
  const requestedScopes = parseJsonArray(intentRow.requestedScopesJson);
  const decisionScopes = buildDecisionScopes(targetScopes, requestedScopes);

  if (!input.approved) {
    await db
      .update(installIntent)
      .set({
        status: "denied",
        deniedReason: input.deniedReason ?? "Denied by target app",
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(installIntent.id, intentRow.id));

    await insertAuditEvent({
      installIntentId: intentRow.id,
      eventType: "install_intent.denied",
      actorType: "target_app",
      actorId: auth.app.id,
      payload: {
        deniedReason: input.deniedReason ?? null,
      },
    });

    return {
      status: "denied",
      connection: null,
      redirectUrl: buildCallbackUrl(intentRow.sourceReturnUrl, {
        falcon_connect_status: "denied",
        falcon_connect_intent_id: intentRow.id,
        falcon_connect_reason: input.deniedReason ?? "Denied by target app",
      }),
    };
  }

  const allowedScopeNames = new Set(decisionScopes.map((scope) => scope.name));
  const grantedScopeNames = new Set(input.grantedScopes as string[]);

  ensure(
    [...grantedScopeNames].every((scope) => allowedScopeNames.has(scope)),
    400,
    "GRANTED_SCOPE_UNKNOWN",
    "The granted scopes contain a scope that is not part of the install intent",
  );

  const finalScopes = decisionScopes.map((scope) => ({
    ...scope,
    selected: scope.required || scope.system || grantedScopeNames.has(scope.name),
  }));

  const connectionRecord = await upsertConnection({
    intent: intentRow,
    targetApp: targetRow,
    scopes: finalScopes,
  });

  await db
    .update(installIntent)
    .set({
      status: "approved",
      deniedReason: null,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(installIntent.id, intentRow.id));

  await insertAuditEvent({
    installIntentId: intentRow.id,
    connectionId: connectionRecord.id,
    eventType: "install_intent.approved",
    actorType: "target_app",
    actorId: auth.app.id,
    payload: {
      grantedScopes: finalScopes.filter((scope) => scope.selected).map((scope) => scope.name),
    },
  });

  await insertAuditEvent({
    installIntentId: intentRow.id,
    connectionId: connectionRecord.id,
    eventType: "connection.activated",
    actorType: "target_app",
    actorId: auth.app.id,
    payload: {
      sourceAppId: intentRow.sourceAppId,
      targetAppId: intentRow.targetAppId,
    },
  });

  return {
    status: "approved",
    connection: connectionRecord,
    redirectUrl: buildCallbackUrl(intentRow.sourceReturnUrl, {
      falcon_connect_status: "approved",
      falcon_connect_intent_id: intentRow.id,
      falcon_connect_connection_id: connectionRecord.id,
    }),
  };
}

export async function issueConnectionAccessToken(auth: AuthenticatedAppRequest, rawInput: unknown) {
  const input = issueConnectionTokenInputSchema.parse(rawInput);
  const [connectionRow] = await db
    .select()
    .from(connection)
    .where(and(eq(connection.id, input.connectionId), eq(connection.sourceAppId, auth.app.id)))
    .limit(1);

  ensure(connectionRow, 404, "CONNECTION_NOT_FOUND", "The connection was not found");
  ensure(
    connectionRow.status === "active",
    409,
    "CONNECTION_NOT_ACTIVE",
    "The connection is not active",
  );

  const grants = await getConnectionScopeGrants(connectionRow.id);
  const token = await signConnectionAccessToken({
    privateJwk: getFalconSigningPrivateJwk(),
    keyId: getFalconSigningKeyId(),
    issuer: getFalconIssuer(),
    audience: connectionRow.targetAppId,
    subject: connectionRow.falconSubjectId,
    claims: {
      kind: "falcon-connect-connection",
      connectionId: connectionRow.id,
      sourceAppId: connectionRow.sourceAppId,
      targetAppId: connectionRow.targetAppId,
      falconSubjectId: connectionRow.falconSubjectId,
      organizationId: connectionRow.organizationId,
      scopes: getScopeNamesFromGrants(grants),
    },
    expiresInSeconds: input.expiresInSeconds ?? DEFAULT_CONNECTION_TOKEN_TTL_SECONDS,
  });
  const claims = connectionAccessTokenClaimsSchema.parse(decodeJwtUnsafe(token));

  await insertAuditEvent({
    connectionId: connectionRow.id,
    eventType: "connection.token_issued",
    actorType: "source_app",
    actorId: auth.app.id,
    payload: {
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      scopes: claims.scopes,
    },
  });

  return {
    token,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    claims,
  };
}

export async function findConnection(auth: AuthenticatedAppRequest, rawInput: unknown) {
  const input = findConnectionInputSchema.parse(rawInput);
  const candidates = await db
    .select()
    .from(connection)
    .where(
      and(
        eq(connection.sourceAppId, auth.app.id),
        eq(connection.targetAppId, input.targetAppId),
        eq(connection.falconSubjectId, input.falconSubjectId),
        eq(connection.organizationId, input.organizationId),
      ),
    )
    .orderBy(desc(connection.updatedAt))
    .limit(10);

  const selected =
    candidates.find((row) => row.status === "active") ??
    candidates.find((row) => row.status === "paused") ??
    candidates[0] ??
    null;

  if (!selected) {
    return null;
  }

  const grants = await getConnectionScopeGrants(selected.id);
  return mapConnectionRecord(selected, grants);
}

export async function introspectConnection(
  auth: AuthenticatedAppRequest,
  rawInput: unknown,
): Promise<IntrospectionResult> {
  const input = introspectConnectionInputSchema.parse(rawInput);
  const decoded = input.connectionToken ? decodeJwtUnsafe(input.connectionToken) : null;
  const connectionId =
    input.connectionId ?? (typeof decoded?.connectionId === "string" ? decoded.connectionId : null);

  ensure(
    connectionId,
    400,
    "CONNECTION_ID_REQUIRED",
    "The connection id is required for introspection",
  );

  const [connectionRow] = await db
    .select()
    .from(connection)
    .where(eq(connection.id, connectionId))
    .limit(1);

  if (!connectionRow || connectionRow.targetAppId !== auth.app.id) {
    return {
      active: false,
      reason: "connection_not_found",
      connection: null,
    };
  }

  const grants = await getConnectionScopeGrants(connectionRow.id);

  if (connectionRow.status !== "active") {
    return {
      active: false,
      reason: connectionRow.status,
      connection: mapConnectionRecord(connectionRow, grants),
    };
  }

  await db
    .update(connection)
    .set({
      lastVerifiedAt: new Date(),
      updatedAt: connectionRow.updatedAt,
    })
    .where(eq(connection.id, connectionRow.id));

  await insertAuditEvent({
    connectionId: connectionRow.id,
    eventType: "connection.introspected",
    actorType: "target_app",
    actorId: auth.app.id,
    payload: {
      via: input.connectionToken ? "token" : "connection_id",
    },
  });

  return {
    active: true,
    reason: null,
    connection: mapConnectionRecord(connectionRow, grants),
  };
}

export async function findIncomingConnection(auth: AuthenticatedAppRequest, rawInput: unknown) {
  const input = findIncomingConnectionInputSchema.parse(rawInput);
  const candidates = await db
    .select()
    .from(connection)
    .where(
      and(
        eq(connection.sourceAppId, input.sourceAppId),
        eq(connection.targetAppId, auth.app.id),
        eq(connection.falconSubjectId, input.falconSubjectId),
        eq(connection.organizationId, input.organizationId),
      ),
    )
    .orderBy(desc(connection.updatedAt))
    .limit(10);

  const selected =
    candidates.find((row) => row.status === "active") ??
    candidates.find((row) => row.status === "paused") ??
    candidates[0] ??
    null;

  if (!selected) {
    return null;
  }

  const grants = await getConnectionScopeGrants(selected.id);
  return mapConnectionRecord(selected, grants);
}

export async function getOpsOverview(): Promise<OpsOverview> {
  const [
    [trustedAppCount],
    [activeConnectionCount],
    [pendingInstallIntentCount],
    [pausedConnectionCount],
  ] = await Promise.all([
    db.select({ value: count() }).from(trustedApp).where(eq(trustedApp.status, "active")),
    db.select({ value: count() }).from(connection).where(eq(connection.status, "active")),
    db.select({ value: count() }).from(installIntent).where(eq(installIntent.status, "pending")),
    db.select({ value: count() }).from(connection).where(eq(connection.status, "paused")),
  ]);

  return {
    trustedAppCount: trustedAppCount?.value ?? 0,
    activeConnectionCount: activeConnectionCount?.value ?? 0,
    pendingInstallIntentCount: pendingInstallIntentCount?.value ?? 0,
    pausedConnectionCount: pausedConnectionCount?.value ?? 0,
  };
}

export async function listTrustedApps() {
  const rows = await db.select().from(trustedApp).orderBy(trustedApp.displayName);

  return Promise.all(rows.map((row) => mapTrustedAppManifestFromRow(row)));
}

export async function listInstallIntents(limit = 25) {
  const rows = await db
    .select()
    .from(installIntent)
    .orderBy(desc(installIntent.createdAt))
    .limit(limit);

  const appIds = uniqueStrings(rows.flatMap((row) => [row.sourceAppId, row.targetAppId]));
  const apps = appIds.length
    ? await db.select().from(trustedApp).where(inArray(trustedApp.id, appIds))
    : [];
  const appMap = new Map(apps.map((app) => [app.id, app.displayName]));

  return rows.map((row) => ({
    ...mapInstallIntentRecord(row),
    sourceAppName: appMap.get(row.sourceAppId) ?? row.sourceAppId,
    targetAppName: appMap.get(row.targetAppId) ?? row.targetAppId,
  }));
}

export async function listConnections(limit = 25) {
  const rows = await db.select().from(connection).orderBy(desc(connection.updatedAt)).limit(limit);
  const appIds = uniqueStrings(rows.flatMap((row) => [row.sourceAppId, row.targetAppId]));
  const [apps, grants] = await Promise.all([
    appIds.length ? db.select().from(trustedApp).where(inArray(trustedApp.id, appIds)) : [],
    rows.length
      ? db
          .select()
          .from(connectionScopeGrant)
          .where(
            inArray(
              connectionScopeGrant.connectionId,
              rows.map((row) => row.id),
            ),
          )
      : [],
  ]);
  const appMap = new Map(apps.map((app) => [app.id, app.displayName]));
  const grantsByConnectionId = new Map<string, ConnectionScopeGrantRow[]>();

  for (const grant of grants) {
    const bucket = grantsByConnectionId.get(grant.connectionId) ?? [];
    bucket.push(grant);
    grantsByConnectionId.set(grant.connectionId, bucket);
  }

  return rows.map((row) => ({
    ...mapConnectionRecord(row, grantsByConnectionId.get(row.id) ?? []),
    sourceAppName: appMap.get(row.sourceAppId) ?? row.sourceAppId,
    targetAppName: appMap.get(row.targetAppId) ?? row.targetAppId,
  }));
}

export async function listAuditEvents(limit = 50) {
  const rows = await db
    .select()
    .from(connectionAuditEvent)
    .orderBy(desc(connectionAuditEvent.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    connectionId: row.connectionId,
    installIntentId: row.installIntentId,
    eventType: row.eventType,
    actorType: row.actorType,
    actorId: row.actorId,
    payload: parseJsonObject(row.payloadJson),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function updateConnectionStatusForApp(
  auth: AuthenticatedAppRequest,
  rawInput: unknown,
) {
  const input = updateConnectionStatusInputSchema.parse(rawInput);
  const [connectionRow] = await db
    .select()
    .from(connection)
    .where(eq(connection.id, input.connectionId))
    .limit(1);

  ensure(connectionRow, 404, "CONNECTION_NOT_FOUND", "The connection was not found");
  ensure(
    connectionRow.sourceAppId === auth.app.id || connectionRow.targetAppId === auth.app.id,
    403,
    "CONNECTION_ACCESS_DENIED",
    "The trusted app cannot manage this connection",
  );

  const now = new Date();
  const nextValues =
    input.status === "active"
      ? {
          status: "active",
          pausedAt: null,
          revokedAt: null,
          revocationReason: null,
          activatedAt: now,
          updatedAt: now,
        }
      : input.status === "paused"
        ? {
            status: "paused",
            pausedAt: now,
            updatedAt: now,
            revocationReason: input.reason ?? null,
          }
        : {
            status: "revoked",
            revokedAt: now,
            updatedAt: now,
            revocationReason: input.reason ?? "Revoked from dashboard",
          };

  await db.update(connection).set(nextValues).where(eq(connection.id, input.connectionId));

  await insertAuditEvent({
    connectionId: input.connectionId,
    eventType: `connection.${input.status}`,
    actorType: connectionRow.sourceAppId === auth.app.id ? "source_app" : "target_app",
    actorId: auth.app.id,
    payload: {
      reason: input.reason ?? null,
    },
  });

  const [updatedRow] = await db
    .select()
    .from(connection)
    .where(eq(connection.id, input.connectionId))
    .limit(1);

  ensure(updatedRow, 500, "CONNECTION_UPDATE_FAILED", "The connection update failed");

  const grants = await getConnectionScopeGrants(updatedRow.id);

  return mapConnectionRecord(updatedRow, grants);
}

export async function updateConnectionStatus(rawInput: unknown) {
  const input = updateConnectionStatusInputSchema.parse(rawInput);
  const [connectionRow] = await db
    .select()
    .from(connection)
    .where(eq(connection.id, input.connectionId))
    .limit(1);

  ensure(connectionRow, 404, "CONNECTION_NOT_FOUND", "The connection was not found");

  const now = new Date();
  const nextValues =
    input.status === "active"
      ? {
          status: "active",
          pausedAt: null,
          revokedAt: null,
          revocationReason: null,
          activatedAt: now,
          updatedAt: now,
        }
      : input.status === "paused"
        ? {
            status: "paused",
            pausedAt: now,
            updatedAt: now,
            revocationReason: input.reason ?? null,
          }
        : {
            status: "revoked",
            revokedAt: now,
            updatedAt: now,
            revocationReason: input.reason ?? "Revoked from dashboard",
          };

  await db.update(connection).set(nextValues).where(eq(connection.id, input.connectionId));

  await insertAuditEvent({
    connectionId: input.connectionId,
    eventType: `connection.${input.status}`,
    actorType: "dashboard_user",
    actorId: "dashboard",
    payload: {
      reason: input.reason ?? null,
    },
  });

  const [updatedRow] = await db
    .select()
    .from(connection)
    .where(eq(connection.id, input.connectionId))
    .limit(1);

  ensure(updatedRow, 500, "CONNECTION_UPDATE_FAILED", "The connection update failed");

  const grants = await getConnectionScopeGrants(updatedRow.id);

  return mapConnectionRecord(updatedRow, grants);
}
