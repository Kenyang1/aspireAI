/**
 * Feedback Agent
 * --------------
 * Job: replace the old single free-text-paragraph grading in
 * src/pages/api/text.js with structured, rubric-grounded feedback.
 *
 * It's grounded (RAG) against the interview rubric knowledge base (STAR
 * method, technical depth, communication clarity, etc. -- see
 * src/data/knowledge/interviewRubric.json) so the model is scoring against
 * explicit written criteria instead of just vibes, and against the role
 * brief so feedback reflects what THIS job actually needs.
 */

import OpenAI from "openai";
import { KnowledgeChunk } from "../lib/rag";
import { AnswerFeedback, RoleBrief } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function assessAnswer(
  question: string,
  transcript: string,
  roleBrief: RoleBrief | null,
  rubricContext: KnowledgeChunk[]
): Promise<AnswerFeedback> {
  const contextText = rubricContext.map((c) => `- ${c.text}`).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an interview coach. Score the candidate's spoken answer (given as a " +
          "transcript) against the rubric notes below. Be specific and reference actual " +
          "words from their answer where possible. " +
          'Return strict JSON with exactly these keys: "starScore" (integer 1-5, how well the ' +
          "answer follows the Situation/Task/Action/Result structure), " +
          '"strengths" (array of up to 3 short strings), "gaps" (array of up to 3 short strings), ' +
          'and "rewriteSuggestion" (a 1-2 sentence example of how to strengthen the answer). ' +
          "No extra keys, no markdown.",
      },
      { role: "system", content: `Rubric notes:\n${contextText}` },
      {
        role: "user",
        content: JSON.stringify({
          targetRole: roleBrief?.targetRole ?? "Software Engineering Intern",
          question,
          candidateTranscript: transcript,
        }),
      },
    ],
    max_completion_tokens: 350,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      starScore: typeof parsed.starScore === "number" ? parsed.starScore : 3,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      rewriteSuggestion:
        typeof parsed.rewriteSuggestion === "string" ? parsed.rewriteSuggestion : "",
    };
  } catch {
    return { starScore: 3, strengths: [], gaps: [], rewriteSuggestion: "" };
  }
}
