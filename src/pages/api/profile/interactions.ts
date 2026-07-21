/**
 * GET /api/profile/interactions?uid=...&kind=mentor_chat&limit=20
 * ---------------------------------------------------------------
 * Returns the student's recent interaction history (mentor chats, career
 * matches, interview feedback), newest first. This is the read side of the
 * interaction log written by the agent API routes.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { recentInteractions, InteractionKind } from "@/lib/repository";

const KINDS: InteractionKind[] = [
  "mentor_chat",
  "career_match",
  "interview_feedback",
  "prep_pipeline",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uid = String(req.query.uid ?? "");
  if (!uid) return res.status(400).json({ error: "uid is required" });

  const kindParam = req.query.kind ? String(req.query.kind) : undefined;
  if (kindParam && !KINDS.includes(kindParam as InteractionKind)) {
    return res.status(400).json({ error: `kind must be one of ${KINDS.join(", ")}` });
  }

  const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);

  try {
    const interactions = await recentInteractions(uid, kindParam as InteractionKind, limit);
    return res.status(200).json({ interactions });
  } catch (error) {
    console.error("interactions error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
