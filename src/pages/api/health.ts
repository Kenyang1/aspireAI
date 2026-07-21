/**
 * GET /api/health
 * ---------------
 * Liveness + configuration probe. Reports which driver each infrastructure
 * layer is running on (real service vs local fallback) and verifies the
 * database answers a query. Used by docker-compose/K8s health checks and
 * handy when wiring up DATABASE_URL / QDRANT_URL / REDIS_URL.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { dbDriver, getDb } from "@/lib/db";
import { cacheDriver } from "@/lib/cache";
import { vectorStoreDriver } from "@/lib/vectorStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const drivers = {
    database: dbDriver(),
    vectorStore: vectorStoreDriver(),
    cache: cacheDriver(),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
  };

  try {
    const db = await getDb();
    await db.query("SELECT 1");
    res.status(200).json({ status: "ok", drivers });
  } catch (error) {
    res.status(503).json({ status: "degraded", drivers, error: (error as Error).message });
  }
}
