import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

let currentConnectionString: string | null = null;
let pool: any = null;
let dbInstance: any = null;

export function getPoolConfig(connectionString?: string): any {
  if (!connectionString) return null;
  try {
    const u = new URL(connectionString);
    if (u.hostname.includes("supabase.co") && u.hostname.startsWith("db.")) {
      const parts = u.hostname.split(".");
      const projectRef = parts[1];
      const password = decodeURIComponent(u.password);
      return {
        host: "aws-0-eu-central-1.pooler.supabase.com",
        port: 6543,
        user: `postgres.${projectRef}`,
        password,
        database: u.pathname.replace(/^\//, "") || "postgres",
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        max: 10,
      };
    }
    return {
      connectionString,
      ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      max: 10,
    };
  } catch {
    return { connectionString, ssl: { rejectUnauthorized: false }, max: 10 };
  }
}

/**
 * Initializes or reuses the database connection pool using the provided runtime connection string
 * (from Cloudflare Hyperdrive or direct DATABASE_URL).
 * Avoids recreating pg.Pool if already connected to the same connection string.
 */
export function setRuntimeDatabaseUrl(connectionString: string) {
  if (!connectionString) return;

  // Reuse existing pool and Drizzle instance if connection string has not changed
  if (dbInstance && pool && currentConnectionString === connectionString) {
    return;
  }

  try {
    if (pool) {
      try {
        pool.end().catch(() => {});
      } catch {
        // ignore cleanup error
      }
    }

    const config = getPoolConfig(connectionString);
    pool = new Pool(config);
    dbInstance = drizzle(pool, { schema });
    currentConnectionString = connectionString;
  } catch (err) {
    console.error("[Database] Runtime initialization error:", err);
    throw err;
  }
}

// In Node.js / Gemini Preview environments where DATABASE_URL is available at process startup:
if (typeof process !== "undefined" && process.env?.DATABASE_URL) {
  try {
    setRuntimeDatabaseUrl(process.env.DATABASE_URL);
  } catch (err) {
    console.error("[Database] Startup connection error:", err);
  }
}

/**
 * Dynamic Drizzle ORM Proxy.
 * Does not require DATABASE_URL during module evaluation.
 * Does not return silent empty arrays or fake objects.
 * Forwards all queries directly to the active runtime dbInstance.
 */
export const db: any = new Proxy({}, {
  get(_target, prop) {
    if (!dbInstance) {
      // Check if DATABASE_URL became available in process.env
      if (typeof process !== "undefined" && process.env?.DATABASE_URL) {
        setRuntimeDatabaseUrl(process.env.DATABASE_URL);
      }
    }

    if (!dbInstance) {
      throw new Error(
        "Database is not initialized. Ensure DATABASE_URL is configured in runtime environment."
      );
    }

    const val = dbInstance[prop];
    if (typeof val === "function") {
      return val.bind(dbInstance);
    }
    return val;
  }
});

export { pool };
export * from "./schema/index";

