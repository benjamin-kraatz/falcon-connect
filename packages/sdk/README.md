# FALCON Connect SDK

This is the TypeScript SDK for integrating partner applications with FALCON Connect.

## Surface Area

- source app helpers
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
- target apps own the user-facing login and consent route
- Falcon issues short-lived JWTs for runtime verification
- target apps verify locally against Falcon JWKS and introspect on fallback

## Mandatory System Scopes

V1 starts with `read:app-info` as a non-disableable Falcon system scope. The SDK treats system and required scopes as locked during consent selection.

## End-to-End Demo Apps

The SDK is exercised end to end in this monorepo by:

- `apps/demo-01` implementing **Project Hub** as the source app
- `apps/demo-02` implementing **Incident Ops** as the target app

Together they cover the high-level source and target clients, the consent helpers, and the lower-level crypto helpers used for signed app requests and JWT verification.

See the [docs site](https://falcon-connect-docs.vercel.app/) for the narrative walkthrough and the demo app READMEs for the local runbook.
