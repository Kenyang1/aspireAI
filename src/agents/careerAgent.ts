/**
 * Career Discovery Agent
 * -----------------------
 * Job: replace the fully-static "Career Paths" grid with a personalized,
 * RAG-grounded ranking. The student answers a short interest quiz; we embed
 * their answers, retrieve the most similar majors from the knowledge base
 * (src/data/knowledge/careers.json / src/data/embeddings/careers.json), and
 * ask the model to explain -- grounded strictly in the retrieved text -- why
 * each one fits. This is the smallest possible RAG loop: retrieve, then
 * generate using ONLY what was retrieved.
 */

import { getOpenAI } from "../lib/openaiClient";
import { KnowledgeChunk } from "../lib/rag";
import { ExplanationStrategy } from "../lib/bandit";
import { CareerMatch } from "./types";

/**
 * Tone/framing instructions per bandit arm. The UCB1 bandit
 * (src/lib/bandit.ts) chooses which of these the agent uses for a given
 * request, and student feedback teaches it which style works best.
 */
const STRATEGY_INSTRUCTIONS: Record<ExplanationStrategy, string> = {
  encouraging:
    "Write in a warm, confidence-building tone that affirms the student's strengths.",
  direct:
    "Write in a plain, evidence-first tone: state the concrete overlap between their interests and the major.",
  future_focused:
    "Write so the student can picture their future day-to-day life in this field.",
};

export async function explainMatches(
  interests: string[],
  matchedCareers: KnowledgeChunk[],
  strategy: ExplanationStrategy = "encouraging"
): Promise<CareerMatch[]> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "A student described their interests. You were given a shortlist of college majors " +
          "that were already retrieved as the best semantic matches -- do not invent other majors. " +
          "For each one, write one sentence (under 30 words) on why it fits THIS student, " +
          "grounded only in the provided major description. " +
          STRATEGY_INSTRUCTIONS[strategy] +
          ' Return strict JSON: ' +
          '{"matches": [{"major": string, "whyItFits": string}]} in the same order given, no markdown.',
      },
      {
        role: "user",
        content: JSON.stringify({
          studentInterests: interests,
          candidateMajors: matchedCareers.map((c) => ({
            major: (c.metadata as { major?: string })?.major ?? c.id,
            description: c.text,
          })),
        }),
      },
    ],
    max_completion_tokens: 300,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.matches)) return parsed.matches;
  } catch {
    // fall through to default below
  }

  return matchedCareers.map((c) => ({
    major: (c.metadata as { major?: string })?.major ?? c.id,
    whyItFits: "This lines up with the interests you described.",
  }));
}
