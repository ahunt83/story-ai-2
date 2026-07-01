import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { chapters, scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";

const createChapterSchema = z.object({
  title: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const input = createChapterSchema.parse(await request.json().catch(() => ({})));
    const [latest] = await db
      .select({ chapterNumber: chapters.chapterNumber })
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(desc(chapters.chapterNumber))
      .limit(1);

    const chapterNumber = (latest?.chapterNumber ?? 0) + 1;
    const chapterId = createId("chapter");
    const sceneId = createId("scene");

    await db.transaction(async (tx) => {
      await tx.insert(chapters).values({
        id: chapterId,
        storyId,
        chapterNumber,
        title: input.title ?? `Chapter ${chapterNumber}`
      });

      await tx.insert(scenes).values({
        id: sceneId,
        chapterId,
        orderIndex: 0,
        title: "Opening Scene",
        draftText: ""
      });
    });

    return ok({ chapterId, sceneId, chapterNumber }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
