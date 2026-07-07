/**
 * scripts/build-embeddings.mjs
 * -----------------------------
 * One-time (well, "run it again whenever you edit the knowledge JSON") script that:
 *   1. Reads the plain-text knowledge snippets in src/data/knowledge/*.json
 *   2. Calls OpenAI's embeddings API for each snippet
 *   3. Writes the results (text + embedding vector) to src/data/embeddings/*.json
 *
 * These embeddings files are what src/lib/rag.ts loads at request time to do
 * retrieval. Re-run this script any time you add/edit a knowledge snippet:
 *
 *   node scripts/build-embeddings.mjs
 *
 * Requires OPENAI_API_KEY to be set (loaded from .env.local below, same as Next.js).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";

// --- tiny .env.local loader (no new dependency needed) ---
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "Missing OPENAI_API_KEY. Add it to .env.local before running this script."
  );
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = "text-embedding-3-small";

async function embed(text) {
  const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return res.data[0].embedding;
}

async function buildFile({ inputPath, outputPath, textField, idField }) {
  const raw = JSON.parse(readFileSync(inputPath, "utf-8"));
  const out = [];

  for (const item of raw) {
    const text = item[textField];
    console.log(`Embedding: ${item[idField]}`);
    const embedding = await embed(text);
    // Shape matches the KnowledgeChunk type in src/lib/rag.ts: everything
    // besides id/text/embedding gets nested under `metadata` (e.g. the
    // careers file's "major" field, or the rubric file's "topic" field).
    const { [idField]: id, [textField]: chunkText, ...metadata } = item;
    out.push({ id, text: chunkText, embedding, metadata });
  }

  writeFileSync(outputPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} embeddings -> ${outputPath}`);
}

async function main() {
  await buildFile({
    inputPath: path.join(process.cwd(), "src/data/knowledge/careers.json"),
    outputPath: path.join(process.cwd(), "src/data/embeddings/careers.json"),
    textField: "text",
    idField: "id",
  });

  await buildFile({
    inputPath: path.join(process.cwd(), "src/data/knowledge/interviewRubric.json"),
    outputPath: path.join(process.cwd(), "src/data/embeddings/rubric.json"),
    textField: "text",
    idField: "id",
  });

  console.log("Done. Commit the src/data/embeddings/*.json files to your repo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
