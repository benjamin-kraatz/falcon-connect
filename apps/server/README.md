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
