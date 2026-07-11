/**
 * Resume Agent
 * ------------
 * Job: read the candidate's raw resume text and turn it into a small,
 * structured profile (skills + highlight stories) that the other agents can
 * use, instead of every downstream agent re-reading the full raw resume.
 *
 * This is intentionally the simplest agent in the pipeline: one focused LLM
 * call with a strict JSON output shape. That's a completely normal "agent" --
 * it doesn't need tools or memory to earn the name, it just needs a narrow,
 * well-defined job.
 */

import OpenAI from "openai";
import { CandidateProfile } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractProfile(resumeText: string): Promise<CandidateProfile> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract structured data from a resume. Return strict JSON with exactly these keys: " +
          '"skills" (array of up to 8 short skill strings) and "highlights" ' +
          "(array of up to 5 short strings, each a notable project/experience highlight, " +
          "written in first person past tense, under 20 words each). No extra keys, no markdown.",
      },
      { role: "user", content: resumeText },
    ],
    max_completion_tokens: 400,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    };
  } catch {
    return { skills: [], highlights: [] };
  }
}
