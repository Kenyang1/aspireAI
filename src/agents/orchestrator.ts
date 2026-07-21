/**
 * Orchestrator
 * ------------
 * This is the "multi-agent system" glue: a plain sequential pipeline that
 * hands output from one agent to the next. No framework needed -- for a
 * pipeline this size, a typed async function is easier to read, debug, and
 * explain in an interview than a graph library would be. (If this grows --
 * e.g. agents that need to loop back and forth, or run in parallel and vote
 * -- that's the point where reaching for something like LangGraph starts to
 * pay for itself.)
 */

import { KnowledgeChunk } from "../lib/rag";
import { retrieve } from "../lib/vectorStore";
import { extractProfile } from "./resumeAgent";
import { buildRoleBrief } from "./researchAgent";
import { generateQuestions } from "./interviewerAgent";
import { CandidateProfile, RoleBrief, TailoredQuestion } from "./types";

export interface PrepPipelineResult {
  profile: CandidateProfile;
  roleBrief: RoleBrief;
  questions: TailoredQuestion[];
}

/**
 * Full "prep" pipeline: Resume Agent -> Research Agent (RAG over rubric
 * notes) -> Interviewer Agent. Used by /api/agents/prep.
 */
export async function runPrepPipeline(
  resumeText: string,
  jobDescription: string
): Promise<PrepPipelineResult> {
  const profile = await extractProfile(resumeText);

  const rubricContext = await retrieve("rubric", jobDescription, 3);
  const roleBrief = await buildRoleBrief(jobDescription, rubricContext);

  const questions = await generateQuestions(profile, roleBrief, 3);

  return { profile, roleBrief, questions };
}

/** Retrieval step used by the Feedback Agent's API route. */
export async function retrieveRubricContext(query: string, k = 3): Promise<KnowledgeChunk[]> {
  return retrieve("rubric", query, k);
}

/** Retrieval step used by the Career Discovery Agent's API route. */
export async function retrieveCareerMatches(query: string, k = 3): Promise<KnowledgeChunk[]> {
  return retrieve("careers", query, k);
}
