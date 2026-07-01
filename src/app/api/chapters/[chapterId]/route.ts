import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { aiMessages, chapterMemories, draftVersions } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { loadChapterBundle } from "./helpers";

export async function GET(_request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const user = await requireUser();
    const { chapterId } = await context.params;
    const bundle = await loadChapterBundle(chapterId, user.id);

    const [latestMemory] = await db
      .select()
      .from(chapterMemories)
      .where(eq(chapterMemories.chapterId, chapterId))
      .orderBy(desc(chapterMemories.createdAt))
      .limit(1);

    const versions = await db
      .select()
      .from(draftVersions)
      .where(eq(draftVersions.chapterId, chapterId))
      .orderBy(desc(draftVersions.createdAt))
      .limit(8);

    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.chapterId, chapterId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(12);

    return ok({
      story: bundle.story,
      chapter: bundle.chapter,
      scenes: bundle.scenes,
      latestMemory,
      draftVersions: versions,
      aiMessages: messages.reverse()
    });
  } catch (error) {
    return fail(error);
  }
}
