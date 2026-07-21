/**
 * /api/profile/saved-careers
 * --------------------------
 * GET    ?uid=...            -> { saved: SavedCareer[] }
 * POST   { uid, major, whyItFits? } -> saves (idempotent upsert)
 * DELETE { uid, major }      -> removes
 *
 * Backed by PostgreSQL (see src/lib/db.ts for the driver strategy).
 */

import type { NextApiRequest, NextApiResponse } from "next";
import {
  listSavedCareers,
  saveCareer,
  unsaveCareer,
  upsertStudent,
} from "@/lib/repository";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const uid = String(req.query.uid ?? "");
      if (!uid) return res.status(400).json({ error: "uid is required" });
      const saved = await listSavedCareers(uid);
      return res.status(200).json({ saved });
    }

    if (req.method === "POST") {
      const { uid, major, whyItFits } = req.body ?? {};
      if (!uid || !major) return res.status(400).json({ error: "uid and major are required" });
      await upsertStudent(uid);
      await saveCareer(uid, major, whyItFits);
      const saved = await listSavedCareers(uid);
      return res.status(200).json({ saved });
    }

    if (req.method === "DELETE") {
      const { uid, major } = req.body ?? {};
      if (!uid || !major) return res.status(400).json({ error: "uid and major are required" });
      await unsaveCareer(uid, major);
      const saved = await listSavedCareers(uid);
      return res.status(200).json({ saved });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("saved-careers error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
