import { eq } from "drizzle-orm";

import { db } from "@/db";
import { storyFoundations } from "@/db/schema";
import { startAiRun } from "@/lib/ai-runs";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";
import { createStoryFoundation } from "@/lib/story-foundation/ai";
import { applyFoundationNsfwPolicy } from "@/lib/story-foundation/nsfw";
import { resolveStoryModelSettings } from "@/lib/story-settings";

export async function POST(_request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    const story = await requireOwnedStory(storyId, user.id);
    const modelSettings = await resolveStoryModelSettings(storyId);
    const aiRun = await startAiRun({
      userId: user.id,
      storyId,
      operation: "story_foundation",
      model: modelSettings.extractionModel
    });
    let foundationRun: Awaited<ReturnType<typeof createStoryFoundation>>;
    try {
      foundationRun = await createStoryFoundation({
        title: story.title,
        initialPrompt: story.initialPrompt,
        genreToneNotes: story.genreToneNotes,
        modelSettings
      });
    } catch (error) {
      await aiRun.fail(error);
      throw error;
    }
    const foundation = {
      ...foundationRun.parsed,
      metadata: { ...foundationRun.parsed.metadata, status: "draft" as const }
    };
    const isNsfw = await applyFoundationNsfwPolicy({ storyId, userId: user.id, foundation });

    await db
      .insert(storyFoundations)
      .values({
        id: createId("foundation"),
        storyId,
        foundation,
        rawResponse: foundationRun.raw,
        status: "draft"
      })
      .onConflictDoUpdate({
        target: storyFoundations.storyId,
        set: {
          foundation,
          rawResponse: foundationRun.raw,
          status: "draft",
          updatedAt: new Date()
        }
      });

    await aiRun.succeed({
      usage: foundationRun.usage,
      repaired: foundationRun.repaired,
      fallbackUsed: foundationRun.fallbackUsed,
      validationStatus: "valid"
    });

    return ok({ foundation, status: "draft", isNsfw });
  } catch (error) {
    return fail(error);
  }
}
