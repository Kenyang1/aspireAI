/**
 * POST /api/agents/assess
 * -------------------------
 * Body: { question: string, transcript: string, roleBrief?: RoleBrief, uid?: string }
 * Retrieves relevant interview-rubric context, then runs the Feedback Agent.
 *
 * When a uid is provided, the graded answer also updates the student's
 * per-competency mastery via Bayesian Knowledge Tracing (src/lib/bkt.ts) and
 * is logged to their interaction history — the response then carries a
 * `mastery` snapshot alongside the feedback.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { retrieveRubricContext } from "@/agents/orchestrator";
import { assessAnswer } from "@/agents/feedbackAgent";
import { RoleBrief } from "@/agents/types";
import { updateMasteryFromAnswer } from "@/lib/bkt";
import { logInteraction, upsertStudent } from "@/lib/repository";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { question, transcript, roleBrief, uid } = req.body ?? {};

  if (!question || !transcript) {
    res.status(400).json({ error: "question and transcript are both required" });
    return;
  }

  try {
    const rubricContext = await retrieveRubricContext(
      `${question} ${(roleBrief as RoleBrief | undefined)?.targetRole ?? ""}`
    );
    const feedback = await assessAnswer(question, transcript, roleBrief ?? null, rubricContext);

    let mastery = undefined;
    if (typeof uid === "string" && uid.length > 0) {
      const competencies = (roleBrief as RoleBrief | undefined)?.likelyCompetencies ?? [];
      await upsertStudent(uid);
      mastery = await updateMasteryFromAnswer(uid, competencies, feedback.starScore);
      await logInteraction(uid, "interview_feedback", {
        question,
        starScore: feedback.starScore,
        competencies,
      });
    }

    res.status(200).json({ feedback, mastery });
  } catch (error) {
    console.error("Error assessing answer:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
