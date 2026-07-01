import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { chapters, scenes, stories, storyBibles, storyFoundations, storyModelSettings } from "@/db/schema";
import { startAiRun } from "@/lib/ai-runs";
import { ok, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { createStoryFoundation } from "@/lib/story-foundation/ai";
import { defaultStoryModelSettings } from "@/lib/story-settings";
import { emptyBible } from "@/lib/story-memory/mock";

const createStorySchema = z.object({
  title: z.string().min(1),
  initialPrompt: z.string().min(1),
  genreToneNotes: z.string().optional()
});

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(stories)
      .where(and(eq(stories.status, "active"), or(eq(stories.ownerUserId, user.id), isNull(stories.ownerUserId))))
      .orderBy(desc(stories.updatedAt));
    return ok({ stories: rows });
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
    const modelSettings = defaultStoryModelSettings();

    await db.transaction(async (tx) => {
      await tx.insert(stories).values({
        id: storyId,
        ownerUserId: user.id,
        title: input.title,
        initialPrompt: input.initialPrompt,
        genreToneNotes: input.genreToneNotes
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
    const foundationRun = await createStoryFoundation({
      title: input.title,
      initialPrompt: input.initialPrompt,
      genreToneNotes: input.genreToneNotes,
      modelSettings
    });
    const foundation = {
      ...foundationRun.parsed,
      metadata: { ...foundationRun.parsed.metadata, status: "draft" as const }
    };

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

    return ok({ storyId, chapterId, sceneId, foundationId }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
