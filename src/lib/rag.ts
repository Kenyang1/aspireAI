/**
 * rag.ts
 * ------
 * A deliberately simple, dependency-free RAG (Retrieval-Augmented Generation) helper.
 *
 * Why no vector database (Pinecone/Chroma/etc.)?
 * Our knowledge base is small (a few dozen short snippets about careers and interview
 * technique), so instead of standing up and paying for a managed vector DB, we:
 *   1. Embed every knowledge snippet ONCE, offline (see scripts/build-embeddings.mjs)
 *      and save the vectors to a JSON file.
 *   2. At request time, embed the user's query, then compare it to every stored vector
 *      with plain cosine similarity (just math, no extra service).
 * This is a completely legitimate RAG pattern for small corpora, and it means you can
 * see exactly how retrieval works instead of it being hidden behind a SaaS API.
 * If the knowledge base ever grows past a few thousand chunks, that's the point where
 * swapping this file's internals for a real vector DB starts to pay off.
 */

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const EMBEDDING_MODEL = "text-embedding-3-small";

export interface KnowledgeChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

/** Turn a string into an embedding vector using OpenAI's embeddings API. */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/** Standard cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embed `query`, compare it against every chunk in `chunks`, and return the
 * top `k` most similar chunks (highest cosine similarity first).
 */
export async function retrieveTopK(
  query: string,
  chunks: KnowledgeChunk[],
  k = 3
): Promise<KnowledgeChunk[]> {
  const queryEmbedding = await embedText(query);
  return [...chunks]
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((entry) => entry.chunk);
}
