import { z } from "zod";

import { env } from "@/lib/env";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type JsonSchemaFormat = {
  name: string;
  schema: Record<string, unknown>;
};

async function openRouterFetch(path: string, body: Record<string, unknown>) {
  if (!env.openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(`https://openrouter.ai/api/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Codex Story AI"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function completeText(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  fallback: string;
}) {
  if (!env.openRouterApiKey) {
    return params.fallback;
  }

  const json = await openRouterFetch("/chat/completions", {
    model: params.model ?? env.openRouterChatModel,
    messages: params.messages,
    temperature: params.temperature ?? 0.8,
    max_tokens: params.maxTokens ?? 1800
  });

  const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content ?? params.fallback;
}

export async function completeJson<T>(params: {
  model?: string;
  messages: ChatMessage[];
  schema: z.ZodType<T>;
  format: JsonSchemaFormat;
  fallback: T;
}) {
  if (!env.openRouterApiKey) {
    return { parsed: params.fallback, raw: JSON.stringify(params.fallback), repaired: false };
  }

  const jsonSchema = {
    ...params.format,
    strict: true,
    schema: params.format.schema
  };

  const json = await openRouterFetch("/chat/completions", {
    model: params.model ?? env.openRouterExtractModel,
    messages: params.messages,
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema
    }
  });

  const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
  const raw = choices?.[0]?.message?.content ?? "";
  const parsedUnknown = JSON.parse(raw);
  const parsed = params.schema.parse(parsedUnknown);

  return { parsed, raw, repaired: false };
}

export async function createEmbeddings(input: string[]) {
  if (input.length === 0) {
    return [];
  }

  if (!env.openRouterApiKey) {
    return input.map((text) => deterministicEmbedding(text, env.openRouterEmbeddingDimensions));
  }

  const json = await openRouterFetch("/embeddings", {
    model: env.openRouterEmbeddingModel,
    input,
    encoding_format: "float"
  });

  const data = json.data as Array<{ embedding: number[] }> | undefined;
  return data?.map((item) => item.embedding) ?? [];
}

export function deterministicEmbedding(text: string, dimensions: number) {
  const values = new Array<number>(dimensions).fill(0);
  for (let index = 0; index < text.length; index += 1) {
    const slot = index % dimensions;
    values[slot] += ((text.charCodeAt(index) % 31) + 1) / 31;
  }

  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => Number((value / magnitude).toFixed(6)));
}
