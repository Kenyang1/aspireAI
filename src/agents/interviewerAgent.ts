/**
 * Interviewer Agent
 * -----------------
 * Job: generate mock-interview questions tailored to this candidate + this
 * role, instead of picking 3 random questions from the old static bank in
 * src/data/data.js.
 *
 * Output shape is deliberately identical to the old questionData tuples
 * ([question, seconds]) so it's a drop-in replacement for the mock interview
 * page's rendering/timer logic -- we're only changing where the questions
 * come from, not the recording/UI flow that already works.
 */

import { getOpenAI } from "../lib/openaiClient";
import { CandidateProfile, RoleBrief, TailoredQuestion } from "./types";


export async function generateQuestions(
  profile: CandidateProfile,
  roleBrief: RoleBrief,
  count = 3
): Promise<TailoredQuestion[]> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write mock-interview questions for a student prepping for a specific role. " +
          "Mix behavioral and technical questions. Reference the candidate's own background " +
          "where it makes the question sharper (e.g. 'Tell me about a time you...' referencing " +
          `one of their highlights). Return strict JSON: {"questions": string[]} with exactly ` +
          `${count} questions, no markdown, no numbering prefixes.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          targetRole: roleBrief.targetRole,
          mustHaveSkills: roleBrief.mustHaveSkills,
          likelyCompetencies: roleBrief.likelyCompetencies,
          candidateSkills: profile.skills,
          candidateHighlights: profile.highlights,
        }),
      },
    ],
    max_completion_tokens: 400,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  let questions: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.questions)) questions = parsed.questions;
  } catch {
    questions = [];
  }

  if (questions.length === 0) {
    questions = [
      `Why are you interested in a ${roleBrief.targetRole} role at this company?`,
      "Tell me about a project where you had to learn something quickly.",
      "Describe a time you disagreed with a teammate. How did you handle it?",
    ];
  }

  return questions.slice(0, count).map((q) => [q, 60]);
}
