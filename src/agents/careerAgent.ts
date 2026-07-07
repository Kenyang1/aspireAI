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

import OpenAI from "openai";
import { KnowledgeChunk } from "../lib/rag";
import { CareerMatch } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function explainMatches(
  interests: string[],
  matchedCareers: KnowledgeChunk[]
): Promise<CareerMatch[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "A student described their interests. You were given a shortlist of college majors " +
          "that were already retrieved as the best semantic matches -- do not invent other majors. " +
          "For each one, write one encouraging sentence (under 30 words) on why it fits THIS " +
          'student, grounded only in the provided major description. Return strict JSON: ' +
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
