import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { chapters, storyFoundations } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { NotFoundError, requireOwnedStory } from "@/lib/ownership";
import { storyFoundationSchema } from "@/lib/story-foundation/schema";

export async function POST(_request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const [foundationRecord] = await db
      .select()
      .from(storyFoundations)
      .where(eq(storyFoundations.storyId, storyId))
      .limit(1);

    if (!foundationRecord) {
      throw new NotFoundError("Story Foundation not found");
    }

    const parsed = storyFoundationSchema.parse(foundationRecord.foundation);
    const foundation = {
      ...parsed,
      metadata: { ...parsed.metadata, status: "approved" as const }
    };
    await db
      .update(storyFoundations)
      .set({ foundation, status: "approved", updatedAt: new Date() })
      .where(eq(storyFoundations.id, foundationRecord.id));

    const [firstChapter] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber))
      .limit(1);

    return ok({ foundation, status: "approved", chapterId: firstChapter?.id ?? null });
  } catch (error) {
    return fail(error);
  }
}
