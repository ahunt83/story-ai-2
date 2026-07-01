import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { chapterMemories, chapters, memoryItems, storyBibles } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { createId } from "@/lib/ids";
import { createEmbeddings } from "@/lib/openrouter";
import { mergeStoryBible } from "@/lib/story-memory/ai";
import { normalizeChapterMemory } from "@/lib/story-memory/normalize";
import { chapterMemorySchema, storyBibleSchema } from "@/lib/story-memory/schema";
import { chapterTextFromScenes, loadChapterBundle } from "../helpers";

const commitSchema = z.object({
  memory: chapterMemorySchema.optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const input = commitSchema.parse(await request.json().catch(() => ({})));
    const bundle = await loadChapterBundle(chapterId);

    const [existingMemoryRecord] = await db
      .select()
      .from(chapterMemories)
      .where(eq(chapterMemories.chapterId, chapterId))
      .orderBy(desc(chapterMemories.createdAt))
      .limit(1);

    const memory = input.memory ?? chapterMemorySchema.parse(existingMemoryRecord?.memory);

    const [existingBibleRecord] = await db
      .select()
      .from(storyBibles)
      .where(eq(storyBibles.storyId, bundle.story.id))
      .limit(1);

    const existingBible = existingBibleRecord?.bible ? storyBibleSchema.parse(existingBibleRecord.bible) : null;
    const merge = await mergeStoryBible({ existingStoryBible: existingBible, chapterMemory: memory });
    const normalized = normalizeChapterMemory(memory);
    const embeddings = await createEmbeddings(normalized.map((item) => `${item.category}: ${item.label}\n${item.content}`));
    const memoryId = existingMemoryRecord?.id ?? createId("memory");

    await db.transaction(async (tx) => {
      if (!existingMemoryRecord) {
        await tx.insert(chapterMemories).values({
          id: memoryId,
          storyId: bundle.story.id,
          chapterId,
          chapterNumber: bundle.chapter.chapterNumber,
          memory,
          validationStatus: "valid",
          approvedForBible: true
        });
      } else {
        await tx.update(chapterMemories).set({
          memory,
          approvedForBible: true,
          updatedAt: new Date()
        }).where(eq(chapterMemories.id, existingMemoryRecord.id));
      }

      await tx
        .insert(storyBibles)
        .values({
          id: existingBibleRecord?.id ?? createId("bible"),
          storyId: bundle.story.id,
          bible: merge.parsed,
          lastUpdatedFromChapterNumber: memory.chapterMetadata.chapterNumber
        })
        .onConflictDoUpdate({
          target: storyBibles.storyId,
          set: {
            bible: merge.parsed,
            lastUpdatedFromChapterNumber: memory.chapterMetadata.chapterNumber,
            updatedAt: new Date()
          }
      });

      await tx.delete(memoryItems).where(eq(memoryItems.chapterMemoryId, memoryId));

      if (normalized.length > 0) {
        await tx.insert(memoryItems).values(normalized.map((item, index) => ({
          id: createId("item"),
          storyId: bundle.story.id,
          chapterId,
          chapterMemoryId: memoryId,
          sourceChapterNumber: memory.chapterMetadata.chapterNumber,
          category: item.category as typeof memoryItems.category.enumValues[number],
          label: item.label,
          content: item.content,
          importance: item.importance,
          persistence: item.persistence,
          evidenceOrBasis: item.evidenceOrBasis,
          payload: item.payload,
          embedding: embeddings[index]
        })));
      }

      await tx.update(chapters).set({
        status: "approved",
        approvedText: bundle.chapter.approvedText ?? chapterTextFromScenes(bundle.scenes),
        updatedAt: new Date()
      }).where(eq(chapters.id, chapterId));
    });

    return ok({ memory, storyBible: merge.parsed, memoryItems: normalized.length });
  } catch (error) {
    return fail(error);
  }
}
