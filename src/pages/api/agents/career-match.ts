/**
 * POST /api/agents/career-match
 * -------------------------------
 * Body: { interests: string[], uid?: string }
 *
 * Pipeline per request:
 *   1. Rate limit by caller IP (Redis-backed fixed window).
 *   2. UCB1 bandit picks an explanation strategy (src/lib/bandit.ts).
 *   3. Vector retrieval of the top-3 majors (Qdrant, or local fallback).
 *   4. Career Discovery Agent explains each match in the chosen style —
 *      response cached per (interests, strategy) to avoid re-billing OpenAI.
 *   5. When a uid is provided, the match is logged to the student's
 *      interaction history in PostgreSQL.
 *
 * The response includes `strategy` so the client can send a reward signal to
 * /api/agents/feedback-signal, closing the bandit's learning loop.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { retrieveCareerMatches } from "@/agents/orchestrator";
import { explainMatches } from "@/agents/careerAgent";
import { selectExplanationStrategy } from "@/lib/bandit";
import { cacheKey, cached, rateLimit, requestIp } from "@/lib/cache";
import { logInteraction, upsertStudent } from "@/lib/repository";

const RESPONSE_TTL_SECONDS = 60 * 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { interests, uid } = req.body ?? {};

  if (!Array.isArray(interests) || interests.length === 0) {
    res.status(400).json({ error: "interests must be a non-empty array of strings" });
    return;
  }

  const limit = await rateLimit(`career-match:${requestIp(req)}`, 20, 60);
  if (!limit.allowed) {
    res.status(429).json({ error: "Too many requests — try again in a minute." });
    return;
  }

  try {
    const { strategy } = await selectExplanationStrategy();

    const query = interests.join(", ");
    const key = cacheKey("career-match", `${strategy}|${query.toLowerCase()}`);

    const explained = await cached(
      key,
      RESPONSE_TTL_SECONDS,
      async () => {
        const matches = await retrieveCareerMatches(query, 3);
        return explainMatches(interests, matches, strategy);
      },
      // Never cache an empty match list (e.g. embeddings not yet generated).
      (matches) => matches.length > 0
    );

    if (typeof uid === "string" && uid.length > 0) {
      await upsertStudent(uid, null, interests);
      await logInteraction(uid, "career_match", { interests, strategy, matches: explained });
    }

    res.status(200).json({ matches: explained, strategy });
  } catch (error) {
    console.error("Error matching careers:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
