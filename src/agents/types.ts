/**
 * Shared types passed between agents. Keeping these in one place makes the
 * "hand-off" between agents explicit -- each agent's job is to turn one of
 * these shapes into the next one in the pipeline.
 */

export interface CandidateProfile {
  skills: string[];
  highlights: string[];
}

export interface RoleBrief {
  targetRole: string;
  mustHaveSkills: string[];
  likelyCompetencies: string[];
}

export type TailoredQuestion = [question: string, seconds: number];

export interface AnswerFeedback {
  starScore: number; // 1-5
  strengths: string[];
  gaps: string[];
  rewriteSuggestion: string;
}

export interface CareerMatch {
  major: string;
  whyItFits: string;
}
