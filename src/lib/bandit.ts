/**
 * bandit.ts
 * ---------
 * UCB1 multi-armed bandit for choosing HOW the AI explains career matches.
 *
 * Each "arm" is an explanation strategy (tone/framing) for the Career
 * Discovery Agent. When a student marks an explanation helpful or unhelpful
 * (POST /api/agents/feedback-signal), that reward updates the arm, so over
 * time the app learns which explanation style actually lands with students
 * instead of hard-coding one.
 *
 * UCB1 (Auer et al. 2002): play each arm once, then always play
 *   argmax_i  mean_i + sqrt(2 * ln(totalPulls) / pulls_i)
 * The second term is an optimism bonus that shrinks as an arm is explored,
 * balancing exploitation of the best-known arm against exploration.
 * Arm statistics persist in PostgreSQL (bandit_arms table).
 */

import { getArmStats, recordArmPull, recordArmReward } from "./repository";

export const EXPLANATION_STRATEGIES = [
  "encouraging", // warm, confidence-building tone
  "direct", // plain, evidence-first reasoning
  "future_focused", // paints a picture of day-to-day life in the field
] as const;

export type ExplanationStrategy = (typeof EXPLANATION_STRATEGIES)[number];

export interface StrategySelection {
  strategy: ExplanationStrategy;
  /** Debug/telemetry view of why this arm won. */
  scores: Array<{ arm: string; pulls: number; mean: number; ucb: number }>;
}

/** Pick an explanation strategy with UCB1 and record the pull. */
export async function selectExplanationStrategy(): Promise<StrategySelection> {
  const stats = await getArmStats([...EXPLANATION_STRATEGIES]);
  const totalPulls = stats.reduce((sum, s) => sum + s.pulls, 0);

  // Any arm never tried yet gets priority (UCB treats its bonus as infinite).
  const untried = stats.find((s) => s.pulls === 0);
  let chosen: string;
  const scores = stats.map((s) => {
    const mean = s.pulls > 0 ? s.totalReward / s.pulls : 0;
    const ucb = s.pulls > 0 ? mean + Math.sqrt((2 * Math.log(Math.max(totalPulls, 1))) / s.pulls) : Infinity;
    return { arm: s.arm, pulls: s.pulls, mean, ucb };
  });

  if (untried) {
    chosen = untried.arm;
  } else {
    chosen = scores.reduce((best, s) => (s.ucb > best.ucb ? s : best)).arm;
  }

  await recordArmPull(chosen);
  return { strategy: chosen as ExplanationStrategy, scores };
}

/** Credit an arm with a reward in [0, 1] (1 = student found it helpful). */
export async function rewardExplanationStrategy(
  strategy: ExplanationStrategy,
  reward: number
): Promise<void> {
  const clamped = Math.max(0, Math.min(1, reward));
  await recordArmReward(strategy, clamped);
}

export function isExplanationStrategy(value: unknown): value is ExplanationStrategy {
  return typeof value === "string" && (EXPLANATION_STRATEGIES as readonly string[]).includes(value);
}
