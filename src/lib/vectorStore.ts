/**
 * vectorStore.ts
 * --------------
 * Retrieval behind a small VectorStore interface with two implementations:
 *
 *   - QdrantVectorStore: real vector database, used when QDRANT_URL is set
 *     (run `npm run sync:qdrant` once to upsert the embeddings). Works with
 *     a local Docker Qdrant or a free Qdrant Cloud cluster.
 *   - LocalVectorStore: the original in-process cosine-similarity scan over
 *     the precomputed JSON embeddings. Also the automatic fallback if a
 *     Qdrant call fails at request time, so retrieval never hard-fails
 *     because a service is down.
 *
 * Collections are logical names ("careers", "rubric") mapped to Qdrant
 * collection names in QDRANT_COLLECTIONS.
 */

import careersEmbeddings from "../data/embeddings/careers.json";
import rubricEmbeddings from "../data/embeddings/rubric.json";
import { KnowledgeChunk, cosineSimilarity, embedText } from "./rag";

export type CollectionName = "careers" | "rubric";

export const QDRANT_COLLECTIONS: Record<CollectionName, string> = {
  careers: "aspire_careers",
  rubric: "aspire_rubric",
};

const LOCAL_CHUNKS: Record<CollectionName, KnowledgeChunk[]> = {
  careers: careersEmbeddings as unknown as KnowledgeChunk[],
  rubric: rubricEmbeddings as unknown as KnowledgeChunk[],
};

export interface RetrievedChunk extends KnowledgeChunk {
  score: number;
}

export interface VectorStore {
  readonly name: "qdrant" | "local";
  retrieve(collection: CollectionName, queryVector: number[], k: number): Promise<RetrievedChunk[]>;
}

// ------------------------------------------------------------------ local

class LocalVectorStore implements VectorStore {
  readonly name = "local" as const;

  async retrieve(collection: CollectionName, queryVector: number[], k: number) {
    return LOCAL_CHUNKS[collection]
      .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryVector, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

// ----------------------------------------------------------------- qdrant

class QdrantVectorStore implements VectorStore {
  readonly name = "qdrant" as const;
  private clientPromise: Promise<import("@qdrant/js-client-rest").QdrantClient> | null = null;

  private getClient() {
    if (!this.clientPromise) {
      this.clientPromise = import("@qdrant/js-client-rest").then(
        ({ QdrantClient }) =>
          new QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY || undefined,
          })
      );
    }
    return this.clientPromise;
  }

  async retrieve(collection: CollectionName, queryVector: number[], k: number) {
    const client = await this.getClient();
    const hits = await client.search(QDRANT_COLLECTIONS[collection], {
      vector: queryVector,
      limit: k,
      with_payload: true,
    });
    return hits.map((hit) => {
      const payload = (hit.payload ?? {}) as Record<string, unknown>;
      return {
        id: String(payload.chunkId ?? hit.id),
        text: String(payload.text ?? ""),
        embedding: queryVector, // not returned by Qdrant; unused downstream
        metadata: (payload.metadata ?? {}) as Record<string, unknown>,
        score: hit.score,
      };
    });
  }
}

// ------------------------------------------------------------- public API

const globalForVs = globalThis as unknown as { __aspireVectorStore?: VectorStore };

export function vectorStoreDriver(): "qdrant" | "local" {
  return process.env.QDRANT_URL ? "qdrant" : "local";
}

function getStore(): VectorStore {
  if (!globalForVs.__aspireVectorStore || globalForVs.__aspireVectorStore.name !== vectorStoreDriver()) {
    globalForVs.__aspireVectorStore =
      vectorStoreDriver() === "qdrant" ? new QdrantVectorStore() : new LocalVectorStore();
  }
  return globalForVs.__aspireVectorStore;
}

const localFallback = new LocalVectorStore();

/**
 * Embed the query and retrieve the top-k most similar chunks from the given
 * collection. Falls back to the in-process store if Qdrant errors.
 */
export async function retrieve(
  collection: CollectionName,
  query: string,
  k = 3
): Promise<RetrievedChunk[]> {
  const queryVector = await embedText(query);
  const store = getStore();
  try {
    return await store.retrieve(collection, queryVector, k);
  } catch (error) {
    if (store.name === "qdrant") {
      console.warn(
        `Qdrant retrieval failed (${(error as Error).message}); falling back to local cosine search.`
      );
      return localFallback.retrieve(collection, queryVector, k);
    }
    throw error;
  }
}
