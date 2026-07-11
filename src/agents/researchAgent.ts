/**
 * Research Agent
 * --------------
 * Job: turn a raw job description into a short, structured "role brief" --
 * the target role name, must-have skills, and the behavioral competencies an
 * interviewer for that role is likely probing for.
 *
 * It's called the "Research" agent because in the full QuorumMD-style version
 * of this pattern, this is the agent you'd extend to actually go fetch outside
 * context (company info, published interview reviews, etc.) via tool calls or
 * web search. For this MVP it grounds itself in our small interview-rubric
 * knowledge base instead, via RAG (see src/lib/rag.ts) -- same shape of agent,
 * smaller data source. Swapping in real web retrieval later is an additive
 * change, not a rewrite.
 */

import OpenAI from "openai";
import { KnowledgeChunk } from "../lib/rag";
import { RoleBrief } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function buildRoleBrief(
  jobDescription: string,
  rubricContext: KnowledgeChunk[]
): Promise<RoleBrief> {
  const contextText = rubricContext.map((c) => `- ${c.text}`).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You analyze a job description and produce a short interview-prep brief. " +
          "Use the interview-competency notes provided as background on what interviewers " +
          "typically probe for, but base the specific skills strictly on the job description. " +
          'Return strict JSON with exactly these keys: "targetRole" (short string), ' +
          '"mustHaveSkills" (array of up to 6 short strings), and "likelyCompetencies" ' +
          "(array of up to 4 short strings drawn from the competency notes that apply to this role). " +
          "No extra keys, no markdown.",
      },
      { role: "system", content: `Interview competency notes:\n${contextText}` },
      { role: "user", content: `Job description:\n${jobDescription}` },
    ],
    max_completion_tokens: 350,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      targetRole: typeof parsed.targetRole === "string" ? parsed.targetRole : "Software Engineer",
      mustHaveSkills: Array.isArray(parsed.mustHaveSkills) ? parsed.mustHaveSkills : [],
      likelyCompetencies: Array.isArray(parsed.likelyCompetencies) ? parsed.likelyCompetencies : [],
    };
  } catch {
    return { targetRole: "Software Engineer", mustHaveSkills: [], likelyCompetencies: [] };
  }
}
