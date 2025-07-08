import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const dbUrl =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL_DEV;

if (!dbUrl) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
  connectionString: dbUrl,
});

export const db = drizzle(pool);
