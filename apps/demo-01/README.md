# Project Hub Demo

`apps/demo-01` is the **source app** reference implementation for Falcon Connect.

Project Hub is a project/work management product that wants live incident context from Incident Ops. It demonstrates:

- `overview`: source-side product context
- `mental-model`: install-time vs runtime separation
- `connect-flow`: install intent creation and redirect into the target app
- `connect-flow/callback`: callback parsing and `connectionId` persistence
- `runtime-calls`: runtime token minting and direct target API calls
- `sdk-internals`: signed request helpers, decoded JWTs, and verified claims

## Running Locally

Start Falcon Connect first:

```bash
bun run dev:server
```

Then run the source app:

```bash
bun run dev
```

The app runs at [http://localhost:4101](http://localhost:4101).

## Demo Runbook

1. Open `http://localhost:4101/connect-flow`.
2. Create an install intent for the current workspace.
3. Complete consent in `demo-02`.
4. Return through the callback.
5. Open `Runtime Calls` and hit the Incident Ops endpoints with fresh Falcon tokens.

For the target app demo, see [demo-02](../demo-02).
