import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { scenes } from "@/db/schema";
import { requireOwnedChapter } from "@/lib/ownership";

export async function loadChapterBundle(chapterId: string, userId: string) {
  const { chapter, story } = await requireOwnedChapter(chapterId, userId);
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
