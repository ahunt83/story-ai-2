import { eq } from "drizzle-orm";

import { db } from "@/db";
import { storyModelSettings } from "@/db/schema";
import { env } from "@/lib/env";
import { createId } from "@/lib/ids";

export type ResolvedStoryModelSettings = {
  chatModel: string;
  revisionModel: string;
  extractionModel: string;
  embeddingModel: string;
  generationTemperature: number;
  revisionTemperature: number;
  maxTokens: number;
};

export const defaultStoryModelSettings = (): ResolvedStoryModelSettings => ({
  chatModel: env.openRouterChatModel,
  revisionModel: env.openRouterChatModel,
  extractionModel: env.openRouterExtractModel,
  embeddingModel: env.openRouterEmbeddingModel,
  generationTemperature: 0.8,
  revisionTemperature: 0.7,
  maxTokens: 1800
});

export async function ensureStoryModelSettings(storyId: string) {
  const [existing] = await db.select().from(storyModelSettings).where(eq(storyModelSettings.storyId, storyId)).limit(1);
  if (existing) {
    return existing;
  }

  const defaults = defaultStoryModelSettings();
  const [created] = await db
    .insert(storyModelSettings)
    .values({
      id: createId("models"),
      storyId,
      ...defaults
    })
    .onConflictDoUpdate({
      target: storyModelSettings.storyId,
      set: {
        ...defaults,
        updatedAt: new Date()
      }
    })
    .returning();

  return created;
}

export async function resolveStoryModelSettings(storyId: string): Promise<ResolvedStoryModelSettings> {
  const settings = await ensureStoryModelSettings(storyId);
  return {
    chatModel: settings.chatModel,
    revisionModel: settings.revisionModel,
    extractionModel: settings.extractionModel,
    embeddingModel: settings.embeddingModel,
    generationTemperature: settings.generationTemperature,
    revisionTemperature: settings.revisionTemperature,
    maxTokens: settings.maxTokens
  };
}
