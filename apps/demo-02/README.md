# Incident Ops Demo

`apps/demo-02` is the **target app** reference implementation for Falcon Connect.

Incident Ops receives install requests from Project Hub, requires a local target-side session, renders consent, and exposes direct runtime endpoints protected by Falcon verification.

Routes:

- `overview`
- `mental-model`
- `login`
- `connect-flow`
- `runtime-calls`
- `sdk-internals`

Target runtime endpoints:

- `POST /api/runtime/incidents`
- `POST /api/runtime/service-health`
- `POST /api/runtime/roster`
- `POST /api/runtime/runbooks`
- `POST /api/runtime/verify`

## Running Locally

Start Falcon Connect first:

```bash
bun run dev:server
```

Then run the target app:

```bash
bun run dev
```

The app runs at [http://localhost:4102](http://localhost:4102).

## Demo Runbook

1. Arrive via the source app install redirect or open `http://localhost:4102/connect-flow`.
2. Sign in locally as `Lena Hart` to approve or `Rory Vale` to observe the role gate.
3. Approve or deny the install.
4. Use `Runtime Calls` to inspect verification payloads with pasted Falcon tokens.

For the source app demo, see [demo-01](../demo-01).
