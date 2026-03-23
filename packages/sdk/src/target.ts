import {
  decideInstallIntentInputSchema,
  decideInstallIntentResultSchema,
  introspectConnectionInputSchema,
  introspectionResultSchema,
  resolveInstallIntentInputSchema,
  resolvedInstallIntentSchema,
  type DecideInstallIntentInput,
  type DecideInstallIntentResult,
  type IntrospectConnectionInput,
  type IntrospectionResult,
  type ResolvedInstallIntent,
} from "./protocol";
import { createFalconAppAuthHeaders, decodeJwtUnsafe, verifyConnectionAccessToken } from "./crypto";
import { normalizeGrantedScopes } from "./ui";

type FetchLike = typeof fetch;

export type FalconConnectTargetClientOptions = {
  baseUrl: string;
  appId: string;
  keyId: string;
  privateJwk: JsonWebKey | string;
  fetch?: FetchLike;
};

async function signedJsonRequest<TInput, TOutput>(
  config: FalconConnectTargetClientOptions,
  input: TInput,
  outputSchema: { parse: (value: unknown) => TOutput },
  route: string,
) {
  const requestUrl = new URL(route, config.baseUrl);
  const body = JSON.stringify(input);
  const authHeaders = await createFalconAppAuthHeaders({
    appId: config.appId,
    keyId: config.keyId,
    privateJwk: config.privateJwk,
    method: "POST",
    url: requestUrl.toString(),
    body,
  });
  const response = await (config.fetch ?? fetch)(requestUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return outputSchema.parse(await response.json());
}

export class FalconConnectTargetClient {
  constructor(private readonly options: FalconConnectTargetClientOptions) {}

  async resolveInstallIntent(intentToken: string): Promise<ResolvedInstallIntent> {
    return signedJsonRequest(
      this.options,
      resolveInstallIntentInputSchema.parse({ intentToken }),
      resolvedInstallIntentSchema,
      "/v1/install-intents/resolve",
    );
  }

  async approveInstallIntent(input: {
    intent: ResolvedInstallIntent;
    intentToken: string;
    selectedScopeNames?: string[];
  }): Promise<DecideInstallIntentResult> {
    return signedJsonRequest(
      this.options,
      decideInstallIntentInputSchema.parse({
        approved: true,
        intentToken: input.intentToken,
        grantedScopes: normalizeGrantedScopes(input.intent, input.selectedScopeNames),
      }),
      decideInstallIntentResultSchema,
      "/v1/install-intents/decision",
    );
  }

  async submitInstallIntentDecision(
    input: DecideInstallIntentInput,
  ): Promise<DecideInstallIntentResult> {
    return signedJsonRequest(
      this.options,
      decideInstallIntentInputSchema.parse(input),
      decideInstallIntentResultSchema,
      "/v1/install-intents/decision",
    );
  }

  async introspectConnection(input: IntrospectConnectionInput): Promise<IntrospectionResult> {
    return signedJsonRequest(
      this.options,
      introspectConnectionInputSchema.parse(input),
      introspectionResultSchema,
      "/v1/connections/introspect",
    );
  }

  async verifyConnectionToken(input: { token: string; allowIntrospectionFallback?: boolean }) {
    try {
      return {
        mode: "local" as const,
        result: await verifyConnectionAccessToken({
          token: input.token,
          issuer: this.options.baseUrl,
          audience: this.options.appId,
          jwksUrl: new URL("/.well-known/jwks.json", this.options.baseUrl).toString(),
        }),
      };
    } catch (error) {
      if (!input.allowIntrospectionFallback) {
        throw error;
      }

      const decoded = decodeJwtUnsafe(input.token);
      const connectionId =
        typeof decoded.connectionId === "string" ? decoded.connectionId : undefined;

      return {
        mode: "introspection" as const,
        result: await this.introspectConnection({
          connectionId,
          connectionToken: input.token,
        }),
      };
    }
  }
}

export function createFalconConnectTargetClient(options: FalconConnectTargetClientOptions) {
  return new FalconConnectTargetClient(options);
}
