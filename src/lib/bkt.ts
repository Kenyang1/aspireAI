/**
 * bkt.ts
 * ------
 * Bayesian Knowledge Tracing (Corbett & Anderson 1995) over interview
 * competencies.
 *
 * Every mock-interview answer is graded by the Feedback Agent (1-5 STAR
 * score). We treat a score >= 3 as a "correct" observation of each
 * competency the question exercised, then run the standard BKT update:
 *
 *   posterior (evidence step):
 *     correct:   p = p(1-slip) / (p(1-slip) + (1-p)guess)
 *     incorrect: p = p(slip)   / (p(slip)   + (1-p)(1-guess))
 *   learning step:
 *     p' = p + (1-p) * pLearn
 *
 * The per-student, per-competency mastery probability persists in PostgreSQL
 * (skill_mastery table) and powers the progress view — so "interview
 * readiness" is a probabilistic estimate that responds to real practice,
 * not a hard-coded percentage.
 */

import { getSkillMastery, setSkillMastery, getMastery, SkillMastery } from "./repository";

export interface BktParams {
  pInit: number; // P(L0): mastery before any evidence
  pLearn: number; // P(T): chance of learning after each opportunity
  pSlip: number; // P(S): chance of failing despite mastery
  pGuess: number; // P(G): chance of succeeding without mastery
}

export const DEFAULT_BKT_PARAMS: BktParams = {
  pInit: 0.2,
  pLearn: 0.15,
  pSlip: 0.1,
  pGuess: 0.2,
};

/** One BKT step: condition on the observation, then apply the learning transition. */
export function bktUpdate(pMastery: number, correct: boolean, params: BktParams = DEFAULT_BKT_PARAMS): number {
  const { pLearn, pSlip, pGuess } = params;
  const posterior = correct
    ? (pMastery * (1 - pSlip)) / (pMastery * (1 - pSlip) + (1 - pMastery) * pGuess)
    : (pMastery * pSlip) / (pMastery * pSlip + (1 - pMastery) * (1 - pGuess));
  return posterior + (1 - posterior) * pLearn;
}

/** Map a 1-5 STAR score onto a binary BKT observation. */
export function observationFromStarScore(starScore: number): boolean {
  return starScore >= 3;
}

/** Competencies assumed when a role brief doesn't provide any. */
export const DEFAULT_COMPETENCIES = ["STAR structure", "Communication", "Role knowledge"];

/**
 * Update a student's mastery for each competency exercised by an answer.
 * Returns the refreshed mastery table for the student.
 */
export async function updateMasteryFromAnswer(
  uid: string,
  competencies: string[],
  starScore: number
): Promise<SkillMastery[]> {
  const skills = (competencies.length > 0 ? competencies : DEFAULT_COMPETENCIES).slice(0, 6);
  const correct = observationFromStarScore(starScore);

  for (const skill of skills) {
    const current = (await getSkillMastery(uid, skill)) ?? DEFAULT_BKT_PARAMS.pInit;
    await setSkillMastery(uid, skill, bktUpdate(current, correct));
  }

  return getMastery(uid);
}
