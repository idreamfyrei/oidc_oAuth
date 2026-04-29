import {
  uuid,
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    firstName: varchar("first_name", { length: 25 }),
    lastName: varchar("last_name", { length: 25 }),

    profileImageURL: text("profile_image_url"),

    email: varchar("email", { length: 322 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),

    password: varchar("password", { length: 255 }),
    salt: text("salt"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    usersEmailUniqueIdx: uniqueIndex("users_email_unique_idx").on(table.email),
  }),
);

export const oauthAuthorizationCodesTable = pgTable(
  "oauth_authorization_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    clientId: varchar("client_id", { length: 255 }).notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scope: text("scope").notNull(),
    nonce: text("nonce"),
    codeChallenge: varchar("code_challenge", { length: 128 }).notNull(),
    codeChallengeMethod: varchar("code_challenge_method", { length: 10 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    authorizationCodesCodeUniqueIdx: uniqueIndex("oauth_authorization_codes_code_unique_idx").on(
      table.code,
    ),
    authorizationCodesUserIdIdx: index("oauth_authorization_codes_user_id_idx").on(table.userId),
    authorizationCodesExpiresAtIdx: index("oauth_authorization_codes_expires_at_idx").on(
      table.expiresAt,
    ),
  }),
);

export const oauthClientsTable = pgTable(
  "oauth_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: varchar("client_id", { length: 255 }).notNull(),
    clientName: varchar("client_name", { length: 255 }).notNull(),
    redirectUris: text("redirect_uris").notNull(),
    applicationType: varchar("application_type", { length: 30 }).notNull(),
    tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", { length: 30 })
      .default("none")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    oauthClientsClientIdUniqueIdx: uniqueIndex("oauth_clients_client_id_unique_idx").on(
      table.clientId,
    ),
  }),
);

export const oauthRefreshTokensTable = pgTable(
  "oauth_refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    clientId: varchar("client_id", { length: 255 }).notNull(),
    scope: text("scope").notNull(),
    nonce: text("nonce"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    rotatedFromTokenId: uuid("rotated_from_token_id"),
  },
  (table) => ({
    refreshTokensTokenUniqueIdx: uniqueIndex("oauth_refresh_tokens_token_unique_idx").on(
      table.token,
    ),
    refreshTokensUserIdIdx: index("oauth_refresh_tokens_user_id_idx").on(table.userId),
    refreshTokensExpiresAtIdx: index("oauth_refresh_tokens_expires_at_idx").on(table.expiresAt),
  }),
);

export const webSessionsTable = pgTable(
  "web_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    clientId: varchar("client_id", { length: 255 }).notNull(),
    csrfNonce: text("csrf_nonce").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    idToken: text("id_token"),
    scope: text("scope").notNull(),
    accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    webSessionsSessionIdUniqueIdx: uniqueIndex("web_sessions_session_id_unique_idx").on(table.sessionId),
    webSessionsUserIdIdx: index("web_sessions_user_id_idx").on(table.userId),
    webSessionsExpiresAtIdx: index("web_sessions_expires_at_idx").on(table.expiresAt),
  }),
);
