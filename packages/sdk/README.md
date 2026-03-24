# FALCON Connect SDK

TypeScript SDK for integrating partner applications with FALCON Connect. The API is **Effect-based** (protocol types use Effect `Schema`, HTTP operations return `Effect` values).

## Import

Use either entry — they export the same symbols:

```ts
import { makeFalconConnectTargetService, FalconConnectTargetService } from "@falcon/sdk/effect";
// or
import { makeFalconConnectTargetService } from "@falcon/sdk";
```

- **Factories:** `makeFalconConnectTargetService`, `makeFalconConnectSourceService` for direct use with `Effect.runPromise` / your runtime.
- **Services:** `FalconConnectTargetService`, `FalconConnectSourceService` with `Layer` and `FalconConnectTargetConfig` / `FalconConnectSourceConfig`.
- **Protocol:** Effect `Schema` in `effect/protocol.ts`.
- **Crypto:** `effect/crypto.ts` — signing, JWKS verification, JWT helpers (`verifyFalconAppRequestEffect`, `signInstallIntentTokenEffect`, …).
- **Errors:** Tagged errors in `effect/errors.ts`.
- **UI:** `buildConsentSelection` / `normalizeGrantedScopes` in `effect/ui.ts`.

See [CHANGELOG.md](./CHANGELOG.md) for breaking changes and migration notes from older Promise/Zod-based releases.

## Surface area

- **Source app:** create install intents, parse install callbacks, mint runtime connection tokens, update connection status.
- **Target app:** resolve install intents, submit consent decisions, look up incoming connections, verify connection tokens (local JWKS + optional introspection), update connection status.
- **Protocol:** trusted app manifests, scope descriptors, install intent payloads, connection token claims, introspection responses.

## Key concepts

- Trusted apps authenticate to Falcon with request signatures backed by their private JWK.
- Target apps own the user-facing login and consent route.
- Falcon issues short-lived JWTs for runtime verification.
- Target apps verify locally against Falcon JWKS and introspect on fallback.

## Mandatory system scopes

The SDK includes `read:app-info` as a non-disableable Falcon system scope. System and required scopes are treated as locked during consent selection.

## End-to-end demo apps

Monorepo demos:

- `apps/demo-01` — **Project Hub** (source app)
- `apps/demo-02` — **Incident Ops** (target app)

They exercise source/target flows, consent helpers, and crypto used for signed requests and JWT verification.

See the docs site and demo READMEs for the local runbook.
