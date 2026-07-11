/**
 * POST /api/agents/prep
 * ----------------------
 * Body: { resumeText: string, jobDescription: string }
 * Runs the full prep pipeline (Resume Agent -> Research Agent -> Interviewer
 * Agent) and returns the candidate profile, role brief, and tailored
 * interview questions. The mock interview page reads the questions back out
 * of sessionStorage (see src/app/dashboard/student/prep/page.tsx) instead of
 * the old random pick from data.js.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { runPrepPipeline } from "@/agents/orchestrator";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { resumeText, jobDescription } = req.body ?? {};

  if (!resumeText || !jobDescription) {
    res.status(400).json({ error: "resumeText and jobDescription are both required" });
    return;
  }

  try {
    const result = await runPrepPipeline(resumeText, jobDescription);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error running prep pipeline:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
