import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const trustedApp = sqliteTable(
  "trusted_app",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull(),
    connectRequestUrl: text("connect_request_url").notNull(),
    dataApiBaseUrl: text("data_api_base_url").notNull(),
    allowedRedirectUrlsJson: text("allowed_redirect_urls_json").notNull(),
    supportEmail: text("support_email"),
    supportUrl: text("support_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("trusted_app_slug_idx").on(table.slug)],
);

export const trustedAppKey = sqliteTable(
  "trusted_app_key",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => trustedApp.id, { onDelete: "cascade" }),
    keyId: text("key_id").notNull(),
    algorithm: text("algorithm").notNull(),
    publicJwkJson: text("public_jwk_json").notNull(),
    status: text("status").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    rotatedAt: integer("rotated_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("trusted_app_key_app_id_key_id_idx").on(table.appId, table.keyId),
    index("trusted_app_key_status_idx").on(table.status),
  ],
);

export const trustedAppScope = sqliteTable(
  "trusted_app_scope",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => trustedApp.id, { onDelete: "cascade" }),
    scopeName: text("scope_name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    requiredByDefault: integer("required_by_default", { mode: "boolean" }).default(false).notNull(),
    systemScope: integer("system_scope", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("trusted_app_scope_app_id_scope_name_idx").on(table.appId, table.scopeName),
  ],
);

export const installIntent = sqliteTable(
  "install_intent",
  {
    id: text("id").primaryKey(),
    sourceAppId: text("source_app_id")
      .notNull()
      .references(() => trustedApp.id, { onDelete: "cascade" }),
    targetAppId: text("target_app_id")
      .notNull()
      .references(() => trustedApp.id, { onDelete: "cascade" }),
    falconSubjectId: text("falcon_subject_id").notNull(),
    organizationId: text("organization_id").notNull(),
    requestedScopesJson: text("requested_scopes_json").notNull(),
    sourceReturnUrl: text("source_return_url").notNull(),
    status: text("status").notNull(),
    deniedReason: text("denied_reason"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("install_intent_source_target_idx").on(table.sourceAppId, table.targetAppId),
    index("install_intent_status_idx").on(table.status),
  ],
);

export const connection = sqliteTable(
  "connection",
  {
    id: text("id").primaryKey(),
    sourceAppId: text("source_app_id")
      .notNull()
      .references(() => trustedApp.id, { onDelete: "cascade" }),
    targetAppId: text("target_app_id")
      .notNull()
      .references(() => trustedApp.id, { onDelete: "cascade" }),
    falconSubjectId: text("falcon_subject_id").notNull(),
    organizationId: text("organization_id").notNull(),
    status: text("status").notNull(),
    targetDataApiBaseUrl: text("target_data_api_base_url").notNull(),
    revocationReason: text("revocation_reason"),
    activatedAt: integer("activated_at", { mode: "timestamp_ms" }),
    pausedAt: integer("paused_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    lastVerifiedAt: integer("last_verified_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("connection_directional_unique_idx").on(
      table.sourceAppId,
      table.targetAppId,
      table.falconSubjectId,
      table.organizationId,
    ),
    index("connection_status_idx").on(table.status),
  ],
);

export const connectionScopeGrant = sqliteTable(
  "connection_scope_grant",
  {
    id: text("id").primaryKey(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connection.id, { onDelete: "cascade" }),
    scopeName: text("scope_name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    required: integer("required", { mode: "boolean" }).default(false).notNull(),
    system: integer("system", { mode: "boolean" }).default(false).notNull(),
    granted: integer("granted", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("connection_scope_grant_connection_id_scope_name_idx").on(
      table.connectionId,
      table.scopeName,
    ),
  ],
);

export const connectionAuditEvent = sqliteTable(
  "connection_audit_event",
  {
    id: text("id").primaryKey(),
    connectionId: text("connection_id").references(() => connection.id, {
      onDelete: "cascade",
    }),
    installIntentId: text("install_intent_id").references(() => installIntent.id, {
      onDelete: "cascade",
    }),
    eventType: text("event_type").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    payloadJson: text("payload_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("connection_audit_event_connection_id_idx").on(table.connectionId),
    index("connection_audit_event_install_intent_id_idx").on(table.installIntentId),
  ],
);

export const trustedAppRequestNonce = sqliteTable(
  "trusted_app_request_nonce",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => trustedApp.id, { onDelete: "cascade" }),
    keyId: text("key_id").notNull(),
    nonce: text("nonce").notNull(),
    requestPath: text("request_path").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("trusted_app_request_nonce_app_id_nonce_idx").on(table.appId, table.nonce),
    index("trusted_app_request_nonce_expires_at_idx").on(table.expiresAt),
  ],
);

export const trustedAppRelations = relations(trustedApp, ({ many }) => ({
  keys: many(trustedAppKey),
  scopes: many(trustedAppScope),
  outgoingInstallIntents: many(installIntent, { relationName: "source_app_install_intents" }),
  incomingInstallIntents: many(installIntent, { relationName: "target_app_install_intents" }),
  outgoingConnections: many(connection, { relationName: "source_app_connections" }),
  incomingConnections: many(connection, { relationName: "target_app_connections" }),
  requestNonces: many(trustedAppRequestNonce),
}));

export const trustedAppKeyRelations = relations(trustedAppKey, ({ one }) => ({
  app: one(trustedApp, {
    fields: [trustedAppKey.appId],
    references: [trustedApp.id],
  }),
}));

export const trustedAppScopeRelations = relations(trustedAppScope, ({ one }) => ({
  app: one(trustedApp, {
    fields: [trustedAppScope.appId],
    references: [trustedApp.id],
  }),
}));

export const installIntentRelations = relations(installIntent, ({ one, many }) => ({
  sourceApp: one(trustedApp, {
    fields: [installIntent.sourceAppId],
    references: [trustedApp.id],
    relationName: "source_app_install_intents",
  }),
  targetApp: one(trustedApp, {
    fields: [installIntent.targetAppId],
    references: [trustedApp.id],
    relationName: "target_app_install_intents",
  }),
  auditEvents: many(connectionAuditEvent),
}));

export const connectionRelations = relations(connection, ({ one, many }) => ({
  sourceApp: one(trustedApp, {
    fields: [connection.sourceAppId],
    references: [trustedApp.id],
    relationName: "source_app_connections",
  }),
  targetApp: one(trustedApp, {
    fields: [connection.targetAppId],
    references: [trustedApp.id],
    relationName: "target_app_connections",
  }),
  scopeGrants: many(connectionScopeGrant),
  auditEvents: many(connectionAuditEvent),
}));

export const connectionScopeGrantRelations = relations(connectionScopeGrant, ({ one }) => ({
  connection: one(connection, {
    fields: [connectionScopeGrant.connectionId],
    references: [connection.id],
  }),
}));

export const connectionAuditEventRelations = relations(connectionAuditEvent, ({ one }) => ({
  connection: one(connection, {
    fields: [connectionAuditEvent.connectionId],
    references: [connection.id],
  }),
  installIntent: one(installIntent, {
    fields: [connectionAuditEvent.installIntentId],
    references: [installIntent.id],
  }),
}));

export const trustedAppRequestNonceRelations = relations(trustedAppRequestNonce, ({ one }) => ({
  app: one(trustedApp, {
    fields: [trustedAppRequestNonce.appId],
    references: [trustedApp.id],
  }),
}));
