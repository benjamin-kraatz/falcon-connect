# FALCON Connect Dashboard

This is the internal operations console for FALCON Connect.

It is not the end-user consent surface. In v1, partner apps host their own connect and consent screens while Falcon staff use this dashboard to inspect and control the platform state.

## Responsibilities

- inspect trusted partner apps
- inspect install intents
- inspect directional connections
- pause, revoke, or reactivate connections
- review verification and lifecycle audit events

## Runtime

This is a TanStack Start application that talks to the Falcon Connect server through authenticated oRPC endpoints.

Run the dashboard in development with:

```bash
bun run dev:web
```
