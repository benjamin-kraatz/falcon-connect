import { createContext } from "@falcon/api/context";
import {
  FalconConnectError,
  authenticateTrustedAppRequest,
  createInstallIntent,
  decideInstallIntent,
  ensureDemoTrustedAppsRegistered,
  getFalconJwks,
  introspectConnection,
  issueConnectionAccessToken,
  resolveInstallIntent,
} from "@falcon/api/connect";
import { appRouter } from "@falcon/api/routers/index";
import { auth } from "@falcon/auth";
import { env } from "@falcon/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ZodError } from "zod";
import type { Context } from "hono";

type AppVariables = {
  trustedAppAuth: Awaited<ReturnType<typeof authenticateTrustedAppRequest>>;
  rawBody: string;
};

const app = new Hono<{ Variables: AppVariables }>();

app.use(logger());
app.use("/*", async (_c, next) => {
  await ensureDemoTrustedAppsRegistered();
  await next();
});
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-falcon-app-id",
      "x-falcon-key-id",
      "x-falcon-timestamp",
      "x-falcon-nonce",
      "x-falcon-signature",
    ],
    credentials: true,
  }),
);

app.onError((error, c) => {
  if (error instanceof FalconConnectError) {
    return c.json(
      {
        error: error.code,
        message: error.message,
      },
      { status: error.status as 400 | 401 | 403 | 404 | 409 | 410 | 500 },
    );
  }

  if (error instanceof ZodError) {
    return c.json(
      {
        error: "VALIDATION_ERROR",
        message: error.message,
      },
      { status: 400 },
    );
  }

  console.error(error);
  return c.json(
    {
      error: "INTERNAL_SERVER_ERROR",
      message: "Unexpected Falcon Connect server error",
    },
    { status: 500 },
  );
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/.well-known/jwks.json", async (c) => {
  return c.json(await getFalconJwks());
});

app.use("/v1/*", async (c, next) => {
  const rawBody = await c.req.raw.clone().text();
  const trustedAppAuth = await authenticateTrustedAppRequest({
    method: c.req.method,
    url: c.req.url,
    headers: c.req.raw.headers,
    body: rawBody,
  });

  c.set("trustedAppAuth", trustedAppAuth);
  c.set("rawBody", rawBody);

  await next();
});

function parseSignedJsonBody(c: Context<{ Variables: AppVariables }>) {
  const rawBody = c.get("rawBody");

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new FalconConnectError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
}

app.post("/v1/install-intents", async (c) => {
  const payload = parseSignedJsonBody(c);

  return c.json(await createInstallIntent(c.get("trustedAppAuth"), payload));
});

app.post("/v1/install-intents/resolve", async (c) => {
  const payload = parseSignedJsonBody(c);
  const intentToken = payload.intentToken;

  if (typeof intentToken !== "string") {
    throw new FalconConnectError(400, "INTENT_TOKEN_REQUIRED", "intentToken is required");
  }

  return c.json(await resolveInstallIntent(c.get("trustedAppAuth"), intentToken));
});

app.post("/v1/install-intents/decision", async (c) => {
  const payload = parseSignedJsonBody(c);

  return c.json(await decideInstallIntent(c.get("trustedAppAuth"), payload));
});

app.post("/v1/connections/access-token", async (c) => {
  const payload = parseSignedJsonBody(c);

  return c.json(await issueConnectionAccessToken(c.get("trustedAppAuth"), payload));
});

app.post("/v1/connections/introspect", async (c) => {
  const payload = parseSignedJsonBody(c);

  return c.json(await introspectConnection(c.get("trustedAppAuth"), payload));
});

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => {
  return c.json({
    service: "falcon-connect",
    status: "ok",
  });
});

export default app;
