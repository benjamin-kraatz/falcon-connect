# FALCON Connect SDK

This is the TypeScript SDK for integrating partner applications with FALCON Connect.

## Surface Area

- source app helpers
  - create install intents
  - parse install callbacks
  - mint runtime connection tokens
- target app helpers
  - resolve install intents
  - submit consent decisions
  - verify Falcon connection tokens locally
  - introspect Falcon as a fallback
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

See the [docs site](https://falcon-connect-docs.vercel.app/) for end-to-end integration details.
