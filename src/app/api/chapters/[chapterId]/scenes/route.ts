import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedChapter } from "@/lib/ownership";

const createSceneSchema = z.object({
  title: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const user = await requireUser();
    const { chapterId } = await context.params;
    await requireOwnedChapter(chapterId, user.id);
    const input = createSceneSchema.parse(await request.json().catch(() => ({})));
    const [latest] = await db
      .select({ orderIndex: scenes.orderIndex })
      .from(scenes)
      .where(eq(scenes.chapterId, chapterId))
      .orderBy(desc(scenes.orderIndex))
      .limit(1);

    const orderIndex = (latest?.orderIndex ?? -1) + 1;
    const [scene] = await db
      .insert(scenes)
      .values({
        id: createId("scene"),
        chapterId,
        orderIndex,
        title: input.title ?? `Scene ${orderIndex + 1}`,
        draftText: ""
      })
      .returning();

    return ok({ scene }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
