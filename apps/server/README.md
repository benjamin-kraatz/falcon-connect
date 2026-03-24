# FALCON Connect Server

This is the Hono server for the FALCON Connect control plane.

## Responsibilities

- app-authenticated install intent creation
- target-app install intent resolution and consent decisions
- Falcon-signed runtime connection token issuance
- introspection fallback for target apps
- JWKS publication for local token verification
- internal ops APIs for the dashboard

## Runtime Model

- partner apps call JSON endpoints under `/v1/*`
- the dashboard uses authenticated oRPC routes
- Better Auth handles dashboard user sessions
- the server signs Falcon JWTs with the configured signing JWK and exposes the public key at `/.well-known/jwks.json`

The server does not forward business data between partner apps. It only manages trusted app metadata, connection state, and verification artifacts.

## Generating A Signing Key

To generate a new Falcon runtime-signing JWK for `FALCON_CONNECT_SIGNING_PRIVATE_JWK`, run:

```bash
bun run gen:jwk -- --mode falcon --key-id falcon-connect-signing-key-1
```

Use the printed private JWK as the server env value and register the matching public JWK in the place where you manage Falcon signing configuration.
