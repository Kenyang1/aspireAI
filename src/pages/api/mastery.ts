/**
 * GET /api/mastery?uid=...
 * ------------------------
 * Returns the student's Bayesian-Knowledge-Traced mastery estimate per
 * interview competency: [{ skill, pMastery (0-1), observations }].
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getMastery } from "@/lib/repository";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = String(req.query.uid ?? "");
  if (!uid) return res.status(400).json({ error: "uid is required" });

  try {
    const mastery = await getMastery(uid);
    return res.status(200).json({ mastery });
  } catch (error) {
    console.error("mastery error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
