import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { chapters, scenes, stories } from "@/db/schema";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export async function requireOwnedStory(storyId: string, userId: string) {
  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), or(eq(stories.ownerUserId, userId), isNull(stories.ownerUserId))))
    .limit(1);

  if (!story) {
    throw new NotFoundError("Story not found");
  }

  if (!story.ownerUserId) {
    const [claimed] = await db
      .update(stories)
      .set({ ownerUserId: userId, updatedAt: new Date() })
      .where(and(eq(stories.id, storyId), isNull(stories.ownerUserId)))
      .returning();
    return claimed ?? { ...story, ownerUserId: userId };
  }

  return story;
}

export async function requireOwnedChapter(chapterId: string, userId: string) {
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) {
    throw new NotFoundError("Chapter not found");
  }

  const story = await requireOwnedStory(chapter.storyId, userId);
  return { chapter, story };
}

export async function requireOwnedScene(sceneId: string, userId: string) {
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1);
  if (!scene) {
    throw new NotFoundError("Scene not found");
  }

  const { chapter, story } = await requireOwnedChapter(scene.chapterId, userId);
  return { scene, chapter, story };
}
