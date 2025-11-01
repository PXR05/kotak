import { dbError, dbLog } from "$lib/utils/log";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

export function getDb() {
  if (!dbInstance) {
    const dbUrl =
      process.env.NODE_ENV === "production"
        ? process.env.DATABASE_URL
        : process.env.DATABASE_URL_DEV;

    if (!dbUrl) throw new Error("[DB] DATABASE_URL is not set");

    dbLog(
      "Using connection:",
      dbUrl ? dbUrl.replace(/:[^:]*@/, ":***@") : "undefined"
    );

    pool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      dbError("Unexpected error on idle client", err);
    });

    pool.on("connect", (client) => {
      dbLog("New client connected to database");
    });

    dbInstance = drizzle(pool, { logger: true });

    pool.query("SELECT NOW()", (err, res) => {
      if (err) {
        dbError("Database connection test failed:", err);
      } else {
        dbLog("Database connected successfully at", res.rows[0].now);
      }
    });
  }

  return dbInstance;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    const database = getDb();
    const value = database[prop as keyof typeof database];
    return typeof value === "function" ? value.bind(database) : value;
  },
});
