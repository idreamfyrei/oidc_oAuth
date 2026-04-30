import "dotenv/config";
import fs from "node:fs";
import { Client } from "pg";
import config from "../src/common/config/connection.js";

const requiredTables = [
  "users",
  "oauth_authorization_codes",
  "oauth_clients",
  "oauth_refresh_tokens",
  "web_sessions",
];

const requiredColumns = {
  users: ["id", "email", "password", "profile_image_url"],
  oauth_clients: ["client_id", "client_name", "redirect_uris", "app_url", "owner_user_id"],
  web_sessions: ["session_id", "user_id", "access_token", "refresh_token", "expires_at"],
};

const failures = [];

const check = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

const hasFile = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

check(Boolean(process.env.DATABASE_URL), "DATABASE_URL is missing.");
check(Boolean(config.issuer), "ISSUER is missing.");
check(!config.issuer.includes(".railway.internal"), "ISSUER must not use .railway.internal.");
check(config.issuer.startsWith("https://"), "Production ISSUER should start with https://.");
check(
  config.webClientRedirectUri.startsWith(config.issuer),
  "WEB_BFF_REDIRECT_URI should use the same public origin as ISSUER.",
);
check(
  Boolean(config.privateKey && config.publicKey) ||
    (hasFile(config.privateKeyPath) && hasFile(config.publicKeyPath)),
  "JWT signing keys are missing. Set PRIVATE_KEY and PUBLIC_KEY in Railway.",
);

if (process.env.DATABASE_URL) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const tableResult = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const tables = new Set(tableResult.rows.map((row) => row.table_name));

    for (const table of requiredTables) {
      check(tables.has(table), `Missing table: ${table}. Run pnpm db:migrate.`);
    }

    for (const [table, columns] of Object.entries(requiredColumns)) {
      const columnResult = await client.query(
        "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1",
        [table],
      );
      const existingColumns = new Set(columnResult.rows.map((row) => row.column_name));

      for (const column of columns) {
        check(existingColumns.has(column), `Missing column: ${table}.${column}. Run pnpm db:migrate.`);
      }
    }
  } catch (error) {
    failures.push(`Database check failed: ${error.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

if (failures.length) {
  console.error("Production check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production check passed.");
console.log(`Issuer: ${config.issuer}`);
console.log(`Web callback: ${config.webClientRedirectUri}`);
