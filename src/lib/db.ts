/**
 * db.ts
 * -----
 * PostgreSQL access layer with two interchangeable drivers:
 *
 *   1. A real PostgreSQL server (node-postgres `Pool`) whenever DATABASE_URL
 *      is set — this is what docker-compose / production uses.
 *   2. An embedded PostgreSQL (PGlite — Postgres compiled to WASM) persisted
 *      to `.data/pglite` when no DATABASE_URL is configured, so local dev
 *      works with zero services installed.
 *
 * Both drivers speak the same SQL and expose the same `query()` shape, so the
 * rest of the app never knows which one it's on. The schema is applied
 * idempotently on first use (CREATE TABLE IF NOT EXISTS), which doubles as a
 * lightweight migration step.
 */

export interface QueryResultLike {
  rows: any[];
}

export interface DbClient {
  query(sql: string, params?: unknown[]): Promise<QueryResultLike>;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS students (
  uid TEXT PRIMARY KEY,
  display_name TEXT,
  interests JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_careers (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  major TEXT NOT NULL,
  why_it_fits TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (uid, major)
);

CREATE TABLE IF NOT EXISTS interactions (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interactions_uid_idx
  ON interactions (uid, created_at DESC);

CREATE TABLE IF NOT EXISTS bandit_arms (
  arm TEXT PRIMARY KEY,
  pulls INTEGER NOT NULL DEFAULT 0,
  total_reward DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skill_mastery (
  uid TEXT NOT NULL,
  skill TEXT NOT NULL,
  p_mastery DOUBLE PRECISION NOT NULL DEFAULT 0.2,
  observations INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, skill)
);
`;

/**
 * Cached on globalThis so Next.js hot reloads (which re-evaluate modules)
 * don't open a new pool / new embedded instance every save.
 */
const globalForDb = globalThis as unknown as {
  __aspireDb?: Promise<DbClient>;
};

async function createClient(): Promise<DbClient> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url });
    await pool.query(SCHEMA_SQL);
    return pool;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("node:path");
  const fs = await import("node:fs");
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  await pglite.exec(SCHEMA_SQL);
  return {
    query: (sql: string, params?: unknown[]) => pglite.query(sql, params as any[]),
  };
}

/** Get the shared database client, initializing it (and the schema) once. */
export function getDb(): Promise<DbClient> {
  if (!globalForDb.__aspireDb) {
    globalForDb.__aspireDb = createClient();
  }
  return globalForDb.__aspireDb;
}

/** Which driver is active — surfaced in /api/health for observability. */
export function dbDriver(): "postgres" | "pglite-embedded" {
  return process.env.DATABASE_URL ? "postgres" : "pglite-embedded";
}
