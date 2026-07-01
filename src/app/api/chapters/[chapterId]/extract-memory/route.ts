import { eq } from "drizzle-orm";

import { db } from "@/db";
import { chapterMemories, chapters, scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { createId } from "@/lib/ids";
import { extractChapterMemory } from "@/lib/story-memory/ai";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { chapterTextFromScenes, loadChapterBundle } from "../helpers";

export async function POST(_request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const bundle = await loadChapterBundle(chapterId);
    const chapterText = bundle.chapter.approvedText ?? chapterTextFromScenes(bundle.scenes);

    if (!chapterText.trim()) {
      throw new Error("Cannot extract memory from an empty chapter");
    }

    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query: chapterText
    }).catch(() => createMockContext());

    const extraction = await extractChapterMemory({
      chapterText,
      chapterNumber: bundle.chapter.chapterNumber,
      title: bundle.chapter.title ?? undefined,
      context: chapterContext
    });

    const memoryId = createId("memory");

    await db.transaction(async (tx) => {
      await tx.update(chapters).set({
        approvedText: chapterText,
        status: "pending_memory_approval",
        updatedAt: new Date()
      }).where(eq(chapters.id, chapterId));

      for (const scene of bundle.scenes) {
        await tx.update(scenes).set({
          approvedText: scene.approvedText ?? scene.draftText,
          updatedAt: new Date()
        }).where(eq(scenes.id, scene.id));
      }

      await tx.insert(chapterMemories).values({
        id: memoryId,
        storyId: bundle.story.id,
        chapterId,
        chapterNumber: bundle.chapter.chapterNumber,
        memory: extraction.parsed,
        validationStatus: extraction.repaired ? "repaired" : "valid",
        extractionModel: env.openRouterExtractModel,
        rawResponse: extraction.raw
      });
    });

    return ok({ memoryId, memory: extraction.parsed, repaired: extraction.repaired });
  } catch (error) {
    return fail(error);
  }
}
