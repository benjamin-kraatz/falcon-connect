# FALCON Connect

> [!IMPORTANT]
> FALCON Connect is in early alpha. The protocol, schema, and SDK will keep changing while the platform is being shaped.

## Overview

FALCON Connect is a registry and verification control plane for app-to-app integrations.

It does **not** proxy or transport business data. Instead, it handles:

- trusted app registration
- install intent creation
- target-app consent state
- directional connection records
- Falcon-signed runtime verification tokens
- fallback introspection for pause and revoke checks

The result is that App A can connect to App B once, then call App B directly with a Falcon-issued connection token instead of reimplementing partner verification flows in every application pair.

## V1 Model

- trusted partner apps are inserted manually by Falcon staff
- connections are directional: `App A -> App B`
- connection scope is `falconSubjectId + organizationId`
- the target app hosts the login and consent UI
- runtime verification is hybrid:
  - local JWT verification for the normal path
  - Falcon introspection for expiry, revocation, or stale-state fallback

## Example Flow

1. App A creates an install intent in Falcon Connect.
2. Falcon validates the request and returns a signed install intent token plus the target app connect URL.
3. The user is redirected to App B.
4. App B resolves the install intent with Falcon, authenticates the user locally, and renders consent.
5. App B approves or denies the request and Falcon stores the directional connection plus granted scopes.
6. Falcon returns a callback URL for App A.
7. App A can now mint short-lived connection access tokens and call App B directly.

## Monorepo Layout

```text
connect/
├── apps/
│   ├── dashboard/   # Internal Falcon ops console
│   ├── docs/        # Partner integration documentation
│   └── server/      # Hono server for Falcon Connect APIs
│   ├── demo-01/     # Demo app for the source app
│   └── demo-02/     # Demo app for the target app
├── packages/
│   ├── api/         # Business logic and oRPC ops routes
│   ├── auth/        # Dashboard authentication
│   ├── db/          # Drizzle schema and database access
│   ├── env/         # Typed runtime bindings
│   ├── infra/       # Alchemy / Cloudflare deployment
│   ├── sdk/         # TypeScript integration SDK
│   └── ui/          # Shared dashboard UI components
```

## SDK

The public TypeScript integration surface lives in [packages/sdk/README.md](./packages/sdk/README.md).

## Running Locally

### Running the Demo Apps

```bash
# Start a single demo app
bun run dev:demo-01
# and
bun run dev:demo-02

# or start both demo apps
bun run dev:demo-all

```

> This will start the demo apps at [http://localhost:**4101**](http://localhost:4101) for the source app and [http://localhost:**4102**](http://localhost:4102) for the target app respectively.

## Stack

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **SQLite/Turso** - Database engine
- **Authentication** - Better-Auth
- **Nx** - Smart monorepo task orchestration and caching
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)

## Getting Started

```bash
bun install
```

1. Start the local database if needed:

```bash
bun run db:local
```

2. Apply the schema:

```bash
bun run db:push
```

3. Run the apps:

```bash
bun run dev
```

The internal dashboard runs on [http://localhost:3001](http://localhost:3001) and the server runs on [http://localhost:3000](http://localhost:3000).

## Deployment (Cloudflare via Alchemy)

- Dev: bun run dev
- Deploy: bun run deploy
- Destroy: bun run destroy

For more details, see the guide on [Deploying to Cloudflare with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy).

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the dashboard application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run db:local`: Start the local SQLite database
- `bun run check`: Run Oxlint and Oxfmt
