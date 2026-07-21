/**
 * repository.ts
 * -------------
 * All SQL for the app lives here, grouped by domain. API routes call these
 * functions instead of writing queries inline, so the schema can evolve in
 * one place.
 */

import { getDb } from "./db";

// ---------------------------------------------------------------- students

export interface StudentProfile {
  uid: string;
  displayName: string | null;
  interests: string[];
}

export async function upsertStudent(
  uid: string,
  displayName?: string | null,
  interests?: string[]
): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO students (uid, display_name, interests)
     VALUES ($1, $2, $3)
     ON CONFLICT (uid) DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, students.display_name),
       interests = CASE WHEN $3::jsonb = '[]'::jsonb THEN students.interests ELSE EXCLUDED.interests END,
       updated_at = now()`,
    [uid, displayName ?? null, JSON.stringify(interests ?? [])]
  );
}

export async function getStudent(uid: string): Promise<StudentProfile | null> {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT uid, display_name, interests FROM students WHERE uid = $1`,
    [uid]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    uid: row.uid,
    displayName: row.display_name,
    interests: Array.isArray(row.interests) ? row.interests : JSON.parse(row.interests ?? "[]"),
  };
}

// ----------------------------------------------------------- saved careers

export interface SavedCareer {
  major: string;
  whyItFits: string | null;
  createdAt: string;
}

export async function saveCareer(uid: string, major: string, whyItFits?: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO saved_careers (uid, major, why_it_fits)
     VALUES ($1, $2, $3)
     ON CONFLICT (uid, major) DO UPDATE SET why_it_fits = COALESCE(EXCLUDED.why_it_fits, saved_careers.why_it_fits)`,
    [uid, major, whyItFits ?? null]
  );
}

export async function unsaveCareer(uid: string, major: string): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM saved_careers WHERE uid = $1 AND major = $2`, [uid, major]);
}

export async function listSavedCareers(uid: string): Promise<SavedCareer[]> {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT major, why_it_fits, created_at FROM saved_careers
     WHERE uid = $1 ORDER BY created_at DESC`,
    [uid]
  );
  return rows.map((r: any) => ({
    major: r.major,
    whyItFits: r.why_it_fits,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

// ------------------------------------------------------------ interactions

export type InteractionKind =
  | "mentor_chat"
  | "career_match"
  | "interview_feedback"
  | "prep_pipeline";

export async function logInteraction(
  uid: string,
  kind: InteractionKind,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO interactions (uid, kind, payload) VALUES ($1, $2, $3)`,
    [uid, kind, JSON.stringify(payload)]
  );
}

export async function recentInteractions(
  uid: string,
  kind?: InteractionKind,
  limit = 20
): Promise<Array<{ kind: string; payload: unknown; createdAt: string }>> {
  const db = await getDb();
  const { rows } = kind
    ? await db.query(
        `SELECT kind, payload, created_at FROM interactions
         WHERE uid = $1 AND kind = $2 ORDER BY created_at DESC LIMIT $3`,
        [uid, kind, limit]
      )
    : await db.query(
        `SELECT kind, payload, created_at FROM interactions
         WHERE uid = $1 ORDER BY created_at DESC LIMIT $2`,
        [uid, limit]
      );
  return rows.map((r: any) => ({
    kind: r.kind,
    payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

// ------------------------------------------------------------- bandit arms

export interface ArmStats {
  arm: string;
  pulls: number;
  totalReward: number;
}

export async function getArmStats(arms: string[]): Promise<ArmStats[]> {
  const db = await getDb();
  // Ensure every arm has a row so UCB1 sees pulls=0 for untried arms.
  for (const arm of arms) {
    await db.query(
      `INSERT INTO bandit_arms (arm) VALUES ($1) ON CONFLICT (arm) DO NOTHING`,
      [arm]
    );
  }
  const placeholders = arms.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await db.query(
    `SELECT arm, pulls, total_reward FROM bandit_arms WHERE arm IN (${placeholders})`,
    arms
  );
  return rows.map((r: any) => ({
    arm: r.arm,
    pulls: Number(r.pulls),
    totalReward: Number(r.total_reward),
  }));
}

export async function recordArmPull(arm: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO bandit_arms (arm, pulls) VALUES ($1, 1)
     ON CONFLICT (arm) DO UPDATE SET pulls = bandit_arms.pulls + 1`,
    [arm]
  );
}

export async function recordArmReward(arm: string, reward: number): Promise<void> {
  const db = await getDb();
  // Upsert so a reward that arrives before the arm's first recorded pull
  // (e.g. after a data reset) is never silently dropped.
  await db.query(
    `INSERT INTO bandit_arms (arm, total_reward) VALUES ($1, $2)
     ON CONFLICT (arm) DO UPDATE SET total_reward = bandit_arms.total_reward + EXCLUDED.total_reward`,
    [arm, reward]
  );
}

// ----------------------------------------------------------- skill mastery

export interface SkillMastery {
  skill: string;
  pMastery: number;
  observations: number;
}

export async function getMastery(uid: string): Promise<SkillMastery[]> {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT skill, p_mastery, observations FROM skill_mastery
     WHERE uid = $1 ORDER BY skill`,
    [uid]
  );
  return rows.map((r: any) => ({
    skill: r.skill,
    pMastery: Number(r.p_mastery),
    observations: Number(r.observations),
  }));
}

export async function getSkillMastery(uid: string, skill: string): Promise<number | null> {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT p_mastery FROM skill_mastery WHERE uid = $1 AND skill = $2`,
    [uid, skill]
  );
  return rows.length ? Number(rows[0].p_mastery) : null;
}

export async function setSkillMastery(uid: string, skill: string, pMastery: number): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO skill_mastery (uid, skill, p_mastery, observations)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (uid, skill) DO UPDATE SET
       p_mastery = EXCLUDED.p_mastery,
       observations = skill_mastery.observations + 1,
       updated_at = now()`,
    [uid, skill, pMastery]
  );
}
