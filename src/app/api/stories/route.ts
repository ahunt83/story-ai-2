import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { chapters, scenes, stories, storyBibles, storyFoundations, storyModelSettings } from "@/db/schema";
import { startAiRun } from "@/lib/ai-runs";
import { ok, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { textSuggestsNsfw } from "@/lib/nsfw";
import { canClaimUnownedStories } from "@/lib/ownership";
import { createStoryFoundation } from "@/lib/story-foundation/ai";
import { applyFoundationNsfwPolicy } from "@/lib/story-foundation/nsfw";
import { defaultStoryModelSettings } from "@/lib/story-settings";
import { emptyBible } from "@/lib/story-memory/mock";
import { ensureUserPreferences, updateUserPreferences } from "@/lib/user-preferences";

const createStorySchema = z.object({
  title: z.string().min(1),
  initialPrompt: z.string().min(1),
  genreToneNotes: z.string().optional(),
  isNsfw: z.boolean().optional()
});

export async function GET() {
  try {
    const user = await requireUser();
    const preferences = await ensureUserPreferences(user.id);
    const allowUnownedClaim = await canClaimUnownedStories();
    const storyFilters = [
      eq(stories.status, "active"),
      preferences.nsfwMode ? undefined : eq(stories.isNsfw, false),
      allowUnownedClaim ? or(eq(stories.ownerUserId, user.id), isNull(stories.ownerUserId)) : eq(stories.ownerUserId, user.id)
    ].filter(Boolean);
    const rows = await db
      .select()
      .from(stories)
      .where(and(...storyFilters))
      .orderBy(desc(stories.updatedAt));
    return ok({ stories: rows, nsfwMode: preferences.nsfwMode });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = createStorySchema.parse(await request.json());
    const storyId = createId("story");
    const chapterId = createId("chapter");
    const sceneId = createId("scene");
    const foundationId = createId("foundation");
    const preferences = await ensureUserPreferences(user.id);
    const initialNsfw = Boolean(input.isNsfw || preferences.nsfwMode || textSuggestsNsfw(input.initialPrompt, input.genreToneNotes));
    const modelSettings = defaultStoryModelSettings({ nsfw: initialNsfw });

    await db.transaction(async (tx) => {
      await tx.insert(stories).values({
        id: storyId,
        ownerUserId: user.id,
        title: input.title,
        initialPrompt: input.initialPrompt,
        genreToneNotes: input.genreToneNotes,
        isNsfw: initialNsfw
      });

      await tx.insert(chapters).values({
        id: chapterId,
        storyId,
        chapterNumber: 1,
        title: "Chapter 1"
      });

      await tx.insert(scenes).values({
        id: sceneId,
        chapterId,
        orderIndex: 0,
        title: "Opening Scene",
        draftText: ""
      });

      await tx.insert(storyBibles).values({
        id: createId("bible"),
        storyId,
        bible: emptyBible,
        lastUpdatedFromChapterNumber: 0
      });

      await tx.insert(storyModelSettings).values({
        id: createId("models"),
        storyId,
        ...modelSettings
      });
    });

    const aiRun = await startAiRun({
      userId: user.id,
      storyId,
      operation: "story_foundation",
      model: modelSettings.extractionModel
    });
    let foundationRun: Awaited<ReturnType<typeof createStoryFoundation>>;
    try {
      foundationRun = await createStoryFoundation({
        title: input.title,
        initialPrompt: input.initialPrompt,
        genreToneNotes: input.genreToneNotes,
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
    const foundationNsfw = await applyFoundationNsfwPolicy({ storyId, userId: user.id, foundation });
    const finalNsfw = initialNsfw || foundationNsfw;

    if (initialNsfw && !preferences.nsfwMode) {
      await updateUserPreferences(user.id, { nsfwMode: true });
    }

    await db.insert(storyFoundations).values({
      id: foundationId,
      storyId,
      foundation,
      rawResponse: foundationRun.raw,
      status: "draft"
    });
    await aiRun.succeed({
      usage: foundationRun.usage,
      repaired: foundationRun.repaired,
      fallbackUsed: foundationRun.fallbackUsed,
      validationStatus: "valid"
    });

    return ok({ storyId, chapterId, sceneId, foundationId, isNsfw: finalNsfw }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
