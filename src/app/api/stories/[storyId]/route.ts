import { eq } from "drizzle-orm";

import { db } from "@/db";
import { chapters, stories } from "@/db/schema";
import { fail, ok } from "@/lib/api";

export async function GET(_request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await context.params;
    const [story] = await db.select().from(stories).where(eq(stories.id, storyId)).limit(1);

    if (!story) {
      return ok({ error: "Story not found" }, { status: 404 });
    }

    const storyChapters = await db.select().from(chapters).where(eq(chapters.storyId, storyId));
    return ok({ story, chapters: storyChapters });
  } catch (error) {
    return fail(error);
  }
}
