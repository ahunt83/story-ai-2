import { eq } from "drizzle-orm";

import { db } from "@/db";
import { aiRuns } from "@/db/schema";
import { createId } from "@/lib/ids";
import { OpenRouterRequestError, OpenRouterStreamError, type OpenRouterUsage } from "@/lib/openrouter";

export type AiRunOperation = typeof aiRuns.operation.enumValues[number];

type StartAiRunParams = {
  userId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  sceneId?: string | null;
  operation: AiRunOperation;
  model: string;
  metadata?: Record<string, unknown>;
};

type FinishAiRunParams = {
  fallbackUsed?: boolean;
  usage?: OpenRouterUsage;
  generationId?: string;
  validationStatus?: string;
  repaired?: boolean;
  metadata?: Record<string, unknown>;
};

export async function startAiRun(params: StartAiRunParams) {
  const id = createId("airun");
  const startedAt = Date.now();

  await db.insert(aiRuns).values({
    id,
    userId: params.userId ?? null,
    storyId: params.storyId ?? null,
    chapterId: params.chapterId ?? null,
    sceneId: params.sceneId ?? null,
    operation: params.operation,
    model: params.model,
    status: "started",
    metadata: params.metadata ?? {}
  });

  return {
    id,
    async succeed(result: FinishAiRunParams = {}) {
      await updateAiRun(id, startedAt, "succeeded", result);
    },
    async fail(error: unknown, result: FinishAiRunParams = {}) {
      await updateAiRun(id, startedAt, "failed", {
        ...result,
        errorMessage: error instanceof Error ? error.message : "AI call failed",
        providerStatus: error instanceof OpenRouterRequestError ? error.status : undefined,
        providerCode: error instanceof OpenRouterStreamError ? String(error.code) : undefined
      });
    }
  };
}

async function updateAiRun(
  id: string,
  startedAt: number,
  status: "succeeded" | "failed",
  params: FinishAiRunParams & { errorMessage?: string; providerStatus?: number; providerCode?: string }
) {
  await db
    .update(aiRuns)
    .set({
      status,
      fallbackUsed: params.fallbackUsed ?? false,
      durationMs: Date.now() - startedAt,
      promptTokens: params.usage?.prompt_tokens,
      completionTokens: params.usage?.completion_tokens,
      totalTokens: params.usage?.total_tokens,
      generationId: params.generationId,
      providerStatus: params.providerStatus,
      providerCode: params.providerCode,
      errorMessage: params.errorMessage,
      validationStatus: params.validationStatus,
      repaired: params.repaired,
      metadata: params.metadata ?? {},
      updatedAt: new Date()
    })
    .where(eq(aiRuns.id, id));
}
