/**
 * POST /api/agents/feedback-signal
 * --------------------------------
 * Body: { strategy: string, helpful: boolean, uid?: string }
 *
 * Reward endpoint for the UCB1 explanation bandit: when a student marks a
 * career-match explanation as helpful (or not), the corresponding arm is
 * credited so future strategy selection improves. Reward is 1 for helpful,
 * 0 otherwise.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { isExplanationStrategy, rewardExplanationStrategy } from "@/lib/bandit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { strategy, helpful } = req.body ?? {};

  if (!isExplanationStrategy(strategy)) {
    res.status(400).json({ error: "strategy must be one of the known explanation strategies" });
    return;
  }
  if (typeof helpful !== "boolean") {
    res.status(400).json({ error: "helpful must be a boolean" });
    return;
  }

  try {
    await rewardExplanationStrategy(strategy, helpful ? 1 : 0);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("feedback-signal error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
