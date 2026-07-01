import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { chapters, storyFoundations } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";
import { applyFoundationNsfwPolicy } from "@/lib/story-foundation/nsfw";
import { storyFoundationSchema } from "@/lib/story-foundation/schema";

export async function GET(_request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    const story = await requireOwnedStory(storyId, user.id);
    const [foundationRecord] = await db
      .select()
      .from(storyFoundations)
      .where(eq(storyFoundations.storyId, storyId))
      .limit(1);
    const [firstChapter] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(asc(chapters.chapterNumber))
      .limit(1);

    return ok({
      story,
      foundation: foundationRecord ? storyFoundationSchema.parse(foundationRecord.foundation) : null,
      foundationId: foundationRecord?.id ?? null,
      status: foundationRecord?.status ?? null,
      chapterId: firstChapter?.id ?? null,
      updatedAt: foundationRecord?.updatedAt ?? null
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const input = await request.json();
    const parsed = storyFoundationSchema.parse(input.foundation ?? input);
    const foundation = {
      ...parsed,
      metadata: { ...parsed.metadata, status: "draft" as const }
    };
    const isNsfw = await applyFoundationNsfwPolicy({ storyId, userId: user.id, foundation });
    const [existing] = await db
      .select()
      .from(storyFoundations)
      .where(eq(storyFoundations.storyId, storyId))
      .limit(1);

    if (existing) {
      await db
        .update(storyFoundations)
        .set({ foundation, status: "draft", rawResponse: JSON.stringify(foundation), updatedAt: new Date() })
        .where(eq(storyFoundations.id, existing.id));
    } else {
      await db.insert(storyFoundations).values({
        id: createId("foundation"),
        storyId,
        foundation,
        rawResponse: JSON.stringify(foundation),
        status: "draft"
      });
    }

    return ok({ foundation, status: "draft", isNsfw });
  } catch (error) {
    return fail(error);
  }
}
