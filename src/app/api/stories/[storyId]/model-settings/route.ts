import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { storyModelSettings } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireOwnedStory } from "@/lib/ownership";
import { ensureStoryModelSettings } from "@/lib/story-settings";

const patchSettingsSchema = z.object({
  chatModel: z.string().min(1).optional(),
  revisionModel: z.string().min(1).optional(),
  extractionModel: z.string().min(1).optional(),
  embeddingModel: z.string().min(1).optional(),
  generationTemperature: z.number().min(0).max(2).optional(),
  revisionTemperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(256).max(32000).optional()
});

export async function GET(_request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const settings = await ensureStoryModelSettings(storyId);
    return ok({ settings });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    await ensureStoryModelSettings(storyId);
    const input = patchSettingsSchema.parse(await request.json());

    const [settings] = await db
      .update(storyModelSettings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(storyModelSettings.storyId, storyId))
      .returning();

    return ok({ settings });
  } catch (error) {
    return fail(error);
  }
}
