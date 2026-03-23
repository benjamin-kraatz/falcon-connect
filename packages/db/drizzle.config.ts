import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
    // Empty string in .env fails drizzle-kit's min(1) validation; omit for local libsql.
    ...(authToken ? { authToken } : {}),
  },
});
