/**
 * POST /api/agents/assess
 * -------------------------
 * Body: { question: string, transcript: string, roleBrief?: RoleBrief }
 * Retrieves relevant interview-rubric context, then runs the Feedback Agent.
 * This replaces src/pages/api/text.js's single free-text grading call with
 * structured, rubric-grounded feedback. (src/pages/api/transcription.js is
 * unchanged -- audio-to-text still happens the same way it always did.)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { retrieveRubricContext } from "@/agents/orchestrator";
import { assessAnswer } from "@/agents/feedbackAgent";
import { RoleBrief } from "@/agents/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { question, transcript, roleBrief } = req.body ?? {};

  if (!question || !transcript) {
    res.status(400).json({ error: "question and transcript are both required" });
    return;
  }

  try {
    const rubricContext = await retrieveRubricContext(
      `${question} ${(roleBrief as RoleBrief | undefined)?.targetRole ?? ""}`
    );
    const feedback = await assessAnswer(question, transcript, roleBrief ?? null, rubricContext);
    res.status(200).json({ feedback });
  } catch (error) {
    console.error("Error assessing answer:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
