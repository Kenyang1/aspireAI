/**
 * sync-qdrant.mjs
 * ---------------
 * Upserts the precomputed knowledge-base embeddings into Qdrant so the app
 * can retrieve with real vector search instead of the in-process fallback.
 *
 * Usage:
 *   QDRANT_URL=http://localhost:6333 node scripts/sync-qdrant.mjs
 *   QDRANT_URL=https://xyz.cloud.qdrant.io QDRANT_API_KEY=... node scripts/sync-qdrant.mjs
 *
 * Idempotent: collections are recreated on each run (tiny corpus, so a full
 * rebuild is cheaper than diffing).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL;
if (!QDRANT_URL) {
  console.error("QDRANT_URL is not set. Example: QDRANT_URL=http://localhost:6333");
  process.exit(1);
}

const COLLECTIONS = [
  { name: "aspire_careers", file: "src/data/embeddings/careers.json" },
  { name: "aspire_rubric", file: "src/data/embeddings/rubric.json" },
];

const client = new QdrantClient({
  url: QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

for (const { name, file } of COLLECTIONS) {
  const chunks = JSON.parse(await readFile(path.resolve(file), "utf8"));
  if (!Array.isArray(chunks) || chunks.length === 0) {
    console.warn(`skipping ${name}: no chunks found in ${file}`);
    continue;
  }

  const vectorSize = chunks[0].embedding.length;
  await client.recreateCollection(name, {
    vectors: { size: vectorSize, distance: "Cosine" },
  });

  await client.upsert(name, {
    wait: true,
    points: chunks.map((chunk, index) => ({
      id: index,
      vector: chunk.embedding,
      payload: {
        chunkId: chunk.id,
        text: chunk.text,
        metadata: chunk.metadata ?? {},
      },
    })),
  });

  console.log(`synced ${chunks.length} chunks -> ${name} (dim ${vectorSize})`);
}

console.log("done.");
