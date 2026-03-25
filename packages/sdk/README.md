# FALCON Connect SDK

This is the TypeScript SDK for integrating partner applications with FALCON Connect.

## Surface Area

- source app helpers
  - fetch a trusted app manifest by app id
  - create install intents
  - parse install callbacks
  - mint runtime connection tokens
  - update connection status (pause, resume, revoke)
- target app helpers
  - resolve install intents
  - submit consent decisions
  - look up an incoming connection by source app, subject, and organization
  - verify Falcon connection tokens locally
  - introspect Falcon as a fallback
  - update connection status (pause, resume, revoke)
- shared protocol
  - trusted app manifests
  - scope descriptors
  - install intent payloads
  - connection token claims
  - introspection responses

## Key Concepts

- trusted apps authenticate to Falcon with request signatures backed by their private JWK
- source apps can preflight a target app's manifest and scope catalog before they create an install intent
- target apps own the user-facing login and consent route
- Falcon issues short-lived JWTs for runtime verification
- target apps verify locally against Falcon JWKS and introspect on fallback

## Mandatory System Scopes

V1 starts with `read:app-info` as a non-disableable Falcon system scope. The SDK treats system and required scopes as locked during consent selection.

## Source-Side Manifest Discovery

If your source app wants to render a scope picker before it starts an install flow, fetch the target app manifest first and build the UI from the returned `scopes`.

```ts
import { createFalconConnectSourceClient } from "@falcon/sdk";

const sourceClient = createFalconConnectSourceClient({
  baseUrl: "https://connect.falcon.example",
  appId: "orders",
  keyId: "orders-key-1",
  privateJwk: JSON.parse(process.env.FALCON_PRIVATE_JWK!),
});

const manifest = await sourceClient.getTrustedAppManifest({
  appId: "invoices",
});

const selectableScopes = manifest.scopes.map((scope) => ({
  name: scope.name,
  title: scope.displayName,
  description: scope.description,
  required: scope.requiredByDefault,
  system: scope.system,
}));
```

This is the recommended way to populate source-side configuration screens. It keeps the source app aligned with the target app's published scope catalog and avoids stale, duplicated scope constants in partner code.

## Recommended Source Flow

For a production source app, the recommended sequence is:

1. fetch the target app manifest if you need to show scopes or target metadata in your UI
2. let the user confirm the requested optional scopes
3. call `createInstallIntent` with the selected scope names
4. redirect to the returned `connectUrl`
5. parse the callback and persist the `connectionId`
6. mint runtime tokens on demand with `issueConnectionAccessToken`

## End-to-End Demo Apps

The SDK is exercised end to end in this monorepo by:

- `apps/demo-01` implementing **Project Hub** as the source app
- `apps/demo-02` implementing **Incident Ops** as the target app

Together they cover the high-level source and target clients, the consent helpers, and the lower-level crypto helpers used for signed app requests and JWT verification.

See the [docs site](https://falcon-connect-docs.vercel.app/) for the narrative walkthrough and the demo app READMEs for the local runbook.
