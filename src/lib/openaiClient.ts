/**
 * openaiClient.ts
 * ---------------
 * Shared, lazily-constructed OpenAI client. Lazy because the SDK throws when
 * OPENAI_API_KEY is missing, and many modules that import an agent (e.g.
 * /api/health via the vector store) must still load and serve requests that
 * never touch OpenAI.
 */

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
