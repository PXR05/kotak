import { defineConfig } from "drizzle-kit";

const dbUrl =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL_DEV;

if (!dbUrl) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: dbUrl },
  verbose: true,
  strict: true,
});
