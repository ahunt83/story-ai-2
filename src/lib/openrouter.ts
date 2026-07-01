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

export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type OpenRouterTextStreamEvent =
  | { type: "metadata"; generationId?: string }
  | { type: "delta"; content: string }
  | { type: "usage"; usage: OpenRouterUsage };

export class OpenRouterRequestError extends Error {
  status: number;
  providerMessage: string;

  constructor(status: number, providerMessage: string) {
    super(describeOpenRouterError(status, providerMessage));
    this.name = "OpenRouterRequestError";
    this.status = status;
    this.providerMessage = providerMessage;
  }
}

export class OpenRouterStreamError extends Error {
  code?: string | number;
  providerMessage: string;

  constructor(providerMessage: string, code?: string | number) {
    super(`OpenRouter stream failed. ${providerMessage}`);
    this.name = "OpenRouterStreamError";
    this.providerMessage = providerMessage;
    this.code = code;
  }
}

function openRouterHeaders() {
  return {
    Authorization: `Bearer ${env.openRouterApiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Codex Story AI"
  };
}

async function openRouterFetch(path: string, body: Record<string, unknown>, signal?: AbortSignal) {
  if (!env.openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(`https://openrouter.ai/api/v1${path}`, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new OpenRouterRequestError(response.status, text);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function describeOpenRouterError(status: number, text: string) {
  const lower = text.toLowerCase();

  if (status === 401 || status === 403) {
    return "OpenRouter authentication failed. Check OPENROUTER_API_KEY in .env.local.";
  }

  if (status === 402 || lower.includes("credit") || lower.includes("balance")) {
    return "OpenRouter reported insufficient credits or balance for this request.";
  }

  if (status === 429 || lower.includes("rate limit")) {
    return "OpenRouter rate limit reached. Wait briefly or choose a less constrained model.";
  }

  if (lower.includes("response_format") || lower.includes("json_schema") || lower.includes("structured")) {
    return "The selected extraction model does not appear to support structured JSON output. Set OPENROUTER_EXTRACT_MODEL to a model with json_schema support.";
  }

  return `OpenRouter request failed (${status}). ${text.slice(0, 500)}`;
}

function usageFrom(json: Record<string, unknown>): OpenRouterUsage | undefined {
  const usage = json.usage;
  if (!usage || typeof usage !== "object") {
    return undefined;
  }

  return usage as OpenRouterUsage;
}

export async function completeText(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  fallback: string;
}) {
  const result = await completeTextWithMetadata(params);
  return result.content;
}

export async function completeTextWithMetadata(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  fallback: string;
}) {
  if (!env.openRouterApiKey) {
    return { content: params.fallback, usage: undefined, fallbackUsed: true };
  }

  const json = await openRouterFetch("/chat/completions", {
    model: params.model ?? env.openRouterChatModel,
    messages: params.messages,
    temperature: params.temperature ?? 0.8,
    max_tokens: params.maxTokens ?? 1800
  });

  const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
  return {
    content: choices?.[0]?.message?.content ?? params.fallback,
    usage: usageFrom(json),
    fallbackUsed: !choices?.[0]?.message?.content
  };
}

export async function* streamTextWithMetadata(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  fallback: string;
  signal?: AbortSignal;
}): AsyncGenerator<OpenRouterTextStreamEvent> {
  if (!env.openRouterApiKey) {
    for (const chunk of chunkFallback(params.fallback)) {
      yield { type: "delta", content: chunk };
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: params.model ?? env.openRouterChatModel,
      messages: params.messages,
      temperature: params.temperature ?? 0.8,
      max_tokens: params.maxTokens ?? 1800,
      stream: true,
      stream_options: { include_usage: true }
    }),
    signal: params.signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new OpenRouterRequestError(response.status, text);
  }

  const generationId = response.headers.get("X-Generation-Id") ?? undefined;
  if (generationId) {
    yield { type: "metadata", generationId };
  }

  if (!response.body) {
    throw new Error("OpenRouter returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const events = takeSseEvents(buffer);
    buffer = events.remainder;

    for (const event of events.blocks) {
      const data = sseData(event);
      if (!data || data === "[DONE]") continue;

      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
        error?: { message?: string; code?: string | number };
        usage?: OpenRouterUsage;
      };

      if (parsed.error) {
        throw new OpenRouterStreamError(parsed.error.message ?? "The provider ended the stream with an error.", parsed.error.code);
      }

      const content = parsed.choices?.[0]?.delta?.content;
      if (content) {
        yield { type: "delta", content };
      }

      if (parsed.usage) {
        yield { type: "usage", usage: parsed.usage };
      }
    }
  }

  const finalData = sseData(buffer);
  if (finalData && finalData !== "[DONE]") {
    const parsed = JSON.parse(finalData) as { choices?: Array<{ delta?: { content?: string } }>; usage?: OpenRouterUsage };
    const content = parsed.choices?.[0]?.delta?.content;
    if (content) yield { type: "delta", content };
    if (parsed.usage) yield { type: "usage", usage: parsed.usage };
  }
}

function takeSseEvents(buffer: string) {
  const blocks: string[] = [];
  let remainder = buffer;
  let boundary = remainder.indexOf("\n\n");

  while (boundary >= 0) {
    blocks.push(remainder.slice(0, boundary));
    remainder = remainder.slice(boundary + 2);
    boundary = remainder.indexOf("\n\n");
  }

  return { blocks, remainder };
}

function sseData(block: string) {
  return block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();
}

function chunkFallback(text: string) {
  const chunks: string[] = [];
  let cursor = 0;
  const size = 80;

  while (cursor < text.length) {
    chunks.push(text.slice(cursor, cursor + size));
    cursor += size;
  }

  return chunks;
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

  return { parsed, raw, repaired: false, usage: usageFrom(json) };
}

export async function createEmbeddings(input: string[]) {
  return createEmbeddingsWithModel(input, env.openRouterEmbeddingModel);
}

export async function createEmbeddingsWithModel(input: string[], model: string) {
  if (input.length === 0) {
    return [];
  }

  if (!env.openRouterApiKey) {
    return input.map((text) => deterministicEmbedding(text, env.openRouterEmbeddingDimensions));
  }

  const json = await openRouterFetch("/embeddings", {
    model,
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
