# Changelog

All notable changes to `@falcon/sdk` are documented here.

## [Unreleased]

### Breaking (v2)

- **Removed** the legacy Promise clients, Zod `protocol`, and root `crypto` / `ui` modules. The package is **Effect-only**.
- The **default entry** `import "@falcon/sdk"` now re-exports the same symbols as `import "@falcon/sdk/effect"`.
- **Dropped** the `zod` peer dependency (protocol validation uses Effect `Schema` only).

### Migration from v1

- Replace `createFalconConnectSourceClient` / `createFalconConnectTargetClient` with `makeFalconConnectSourceService` / `makeFalconConnectTargetService` (or `FalconConnectSourceService` / `FalconConnectTargetService` with `Layer`).
- Replace Zod `*Schema` usage with Effect `Schema` exports from `@falcon/sdk/effect` (or `@falcon/sdk`).
- Run client methods with `Effect.runPromise` (or your preferred runner) instead of awaiting Promises directly.
- Use `new URL(...)` for URL fields and branded constructors such as `AppId.make` / `IntentToken.make` where required by the schema.

## Historical: v1 deprecation window

Before v2, the default entry exposed Promise clients and Zod schemas; that surface was deprecated in favor of `@falcon/sdk/effect`. Those APIs are removed in v2 as described above.
