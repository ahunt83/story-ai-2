import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { chapters, scenes, stories, storyBibles } from "@/db/schema";
import { ok, fail } from "@/lib/api";
import { createId } from "@/lib/ids";
import { emptyBible } from "@/lib/story-memory/mock";

const createStorySchema = z.object({
  title: z.string().min(1),
  initialPrompt: z.string().min(1),
  genreToneNotes: z.string().optional()
});

export async function GET() {
  try {
    const rows = await db.select().from(stories).where(eq(stories.status, "active")).orderBy(desc(stories.updatedAt));
    return ok({ stories: rows });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createStorySchema.parse(await request.json());
    const storyId = createId("story");
    const chapterId = createId("chapter");
    const sceneId = createId("scene");

    await db.transaction(async (tx) => {
      await tx.insert(stories).values({
        id: storyId,
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
    });

    return ok({ storyId, chapterId, sceneId }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
