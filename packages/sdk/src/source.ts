import {
  createInstallIntentInputSchema,
  createInstallIntentResultSchema,
  connectionRecordSchema,
  findConnectionInputSchema,
  issueConnectionTokenInputSchema,
  issueConnectionTokenResultSchema,
  type CreateInstallIntentInput,
  type CreateInstallIntentResult,
  type FindConnectionInput,
  type ConnectionRecord,
  type IssueConnectionTokenInput,
  type IssueConnectionTokenResult,
} from "./protocol";
import { createFalconAppAuthHeaders } from "./crypto";

type FetchLike = typeof fetch;

export type FalconConnectSourceClientOptions = {
  baseUrl: string;
  appId: string;
  keyId: string;
  privateJwk: JsonWebKey | string;
  fetch?: FetchLike;
};

async function signedJsonRequest<TInput, TOutput>(
  config: FalconConnectSourceClientOptions,
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

export class FalconConnectSourceClient {
  constructor(private readonly options: FalconConnectSourceClientOptions) {}

  async createInstallIntent(input: CreateInstallIntentInput): Promise<CreateInstallIntentResult> {
    return signedJsonRequest(
      this.options,
      createInstallIntentInputSchema.parse(input),
      createInstallIntentResultSchema,
      "/v1/install-intents",
    );
  }

  async issueConnectionAccessToken(
    input: IssueConnectionTokenInput,
  ): Promise<IssueConnectionTokenResult> {
    return signedJsonRequest(
      this.options,
      issueConnectionTokenInputSchema.parse(input),
      issueConnectionTokenResultSchema,
      "/v1/connections/access-token",
    );
  }

  async findConnection(input: FindConnectionInput): Promise<ConnectionRecord | null> {
    return signedJsonRequest(
      this.options,
      findConnectionInputSchema.parse(input),
      {
        parse: (value) => (value == null ? null : connectionRecordSchema.parse(value)),
      },
      "/v1/connections/find",
    );
  }

  parseInstallCallback(url: string | URL) {
    const callbackUrl = url instanceof URL ? url : new URL(url);

    return {
      status: callbackUrl.searchParams.get("falcon_connect_status"),
      connectionId: callbackUrl.searchParams.get("falcon_connect_connection_id"),
      intentId: callbackUrl.searchParams.get("falcon_connect_intent_id"),
      reason: callbackUrl.searchParams.get("falcon_connect_reason"),
    };
  }
}

export function createFalconConnectSourceClient(options: FalconConnectSourceClientOptions) {
  return new FalconConnectSourceClient(options);
}
