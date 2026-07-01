import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { chapters, scenes, stories } from "@/db/schema";

export async function loadChapterBundle(chapterId: string) {
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) {
    throw new Error("Chapter not found");
  }

  const [story] = await db.select().from(stories).where(eq(stories.id, chapter.storyId)).limit(1);
  if (!story) {
    throw new Error("Story not found");
  }

  const chapterScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.chapterId, chapterId))
    .orderBy(asc(scenes.orderIndex));

  return { story, chapter, scenes: chapterScenes };
}

export function chapterTextFromScenes(sceneRows: Awaited<ReturnType<typeof loadChapterBundle>>["scenes"]) {
  return sceneRows.map((scene) => scene.approvedText ?? scene.draftText).filter(Boolean).join("\n\n");
}
