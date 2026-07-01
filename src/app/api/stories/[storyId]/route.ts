import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { chapters, scenes, stories } from "@/db/schema";
import { fail, ok } from "@/lib/api";

export async function GET(_request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await context.params;
    const [story] = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);

    if (!story) {
      return ok({ error: "Story not found" }, { status: 404 });
    }

    const storyChapters = await db.select().from(chapters).where(eq(chapters.storyId, storyId)).orderBy(asc(chapters.chapterNumber));
    const chapterIds = storyChapters.map((chapter) => chapter.id);
    const storyScenes = chapterIds.length > 0
      ? await db.select().from(scenes).where(inArray(scenes.chapterId, chapterIds))
      : [];
    const wordCounts = new Map<string, number>();

    for (const scene of storyScenes) {
      const count = scene.draftText.trim().split(/\s+/).filter(Boolean).length;
      wordCounts.set(scene.chapterId, (wordCounts.get(scene.chapterId) ?? 0) + count);
    }

    return ok({
      story,
      chapters: storyChapters.map((chapter) => ({
        ...chapter,
        wordCount: wordCounts.get(chapter.id) ?? 0
      }))
    });
  } catch (error) {
    return fail(error);
  }
}
