# FALCON Connect

> [!IMPORTANT]
> This project is still in early alpha. The features and functionality might change significantly during the development process, even during minor releases.

## What is FALCON Connect?

> This explanation might be incomplete and/or might be extended in the future.

With FALCON Connect, app developers (during the early alpha, only FALCON-supported applications that the team behind FALCON controls) can implement service integration.
That means, when two distinct applications want to exchange data, they can use FALCON Connect to "install" the other apps.

**Important**: FALCON Connect _does not_ manage the actual data exchange. It only provides the infrastructure to enable the exchange.

## Example Flow

This flow shows how FALCON Connect conceptually works. Assume that user in application A wants to enable the app to read data from application B.

1. User goes to app A's settings page and sees "Connect App B"
2. They click on "Connect"
3. They are redirected to app B at a specific URL (e.g. https://app-b.com/falcon/connect-request?app-a=https://app-a.com&app-a-pubkey=...)
4. Next steps depends on the sign in state:
   - If the user is not signed in, they are redirected to the sign in page. After signing in, they go to the next step.
   - If the user is signed in, they go to the next step directly.
5. User confirms the installation of this integration (or denies it). They see the capabilities/scopes that app A has requested from app B
6. They are redirected to app A's settings page
7. They see that the connection is established (or not)

This is only a high level flow, and might work a little different in some small edge cases. Also, it might be extended in the future.

Now, the apps can communicate with each other. During the installation and connection process, app B told app A the base URL of the endpoint to communicate with.
This base URL is completely independent from the FALCON Connect infrastructure. It is only a convenience for exchanging basic information between the apps.

### Gotcha

In very, very simple terms, this is very similar to how OAuth works. But with a few key differences:

OAuth is a standard for authentication, while FALCON Connect is a standard for service integration. The auth client is pretty analogous to the source application, and the Identity Provider is somewhat analogous to the target application.

---

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

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses SQLite with Drizzle ORM.

1. Start the local SQLite database (optional):

```bash
bun run db:local
```

2. Update your `.env` file in the `apps/server` directory with the appropriate connection details if needed.

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@falcon/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Deployment (Cloudflare via Alchemy)

- Dev: bun run dev
- Deploy: bun run deploy
- Destroy: bun run destroy

For more details, see the guide on [Deploying to Cloudflare with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy).

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
connect/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run db:local`: Start the local SQLite database
- `bun run check`: Run Oxlint and Oxfmt
