/**
 * POST /api/agents/career-match
 * -------------------------------
 * Body: { interests: string[] }
 * Retrieves the top-3 majors matching the student's stated interests (cosine
 * similarity over pre-computed embeddings) and asks the Career Discovery
 * Agent to explain why each fits, grounded strictly in the retrieved text.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { retrieveCareerMatches } from "@/agents/orchestrator";
import { explainMatches } from "@/agents/careerAgent";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { interests } = req.body ?? {};

  if (!Array.isArray(interests) || interests.length === 0) {
    res.status(400).json({ error: "interests must be a non-empty array of strings" });
    return;
  }

  try {
    const query = interests.join(", ");
    const matches = await retrieveCareerMatches(query, 3);
    const explained = await explainMatches(interests, matches);
    res.status(200).json({ matches: explained });
  } catch (error) {
    console.error("Error matching careers:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
