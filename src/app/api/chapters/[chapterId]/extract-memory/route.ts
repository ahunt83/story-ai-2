import { eq } from "drizzle-orm";

import { db } from "@/db";
import { characterCandidates, chapterMemories, chapters, scenes } from "@/db/schema";
import { startAiRun } from "@/lib/ai-runs";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { createId } from "@/lib/ids";
import { extractChapterMemory } from "@/lib/story-memory/ai";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { resolveStoryModelSettings } from "@/lib/story-settings";
import { chapterTextFromScenes, loadChapterBundle } from "../helpers";

export async function POST(_request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const user = await requireUser();
    const { chapterId } = await context.params;
    const bundle = await loadChapterBundle(chapterId, user.id);
    const chapterText = bundle.chapter.approvedText ?? chapterTextFromScenes(bundle.scenes);

    if (!chapterText.trim()) {
      throw new Error("Cannot extract memory from an empty chapter");
    }

    const modelSettings = await resolveStoryModelSettings(bundle.story.id);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query: chapterText,
      embeddingModel: modelSettings.embeddingModel
    }).catch(() => createMockContext());
    const aiRun = await startAiRun({
      userId: user.id,
      storyId: bundle.story.id,
      chapterId,
      operation: "extract_memory",
      model: modelSettings.extractionModel,
      metadata: { chapterNumber: bundle.chapter.chapterNumber }
    });

    const extraction = await extractChapterMemory({
      chapterText,
      chapterNumber: bundle.chapter.chapterNumber,
      title: bundle.chapter.title ?? undefined,
      context: chapterContext,
      modelSettings
    }).catch(async (error) => {
      await aiRun.fail(error, { validationStatus: "invalid" });
      throw error;
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
        extractionModel: modelSettings.extractionModel,
        rawResponse: extraction.raw
      });

      if (extraction.parsed.newCharacterCandidates.length > 0) {
        await tx.insert(characterCandidates).values(extraction.parsed.newCharacterCandidates.map((candidate) => ({
          id: candidate.candidateId || createId("candidate"),
          storyId: bundle.story.id,
          chapterId,
          chapterMemoryId: memoryId,
          possibleName: candidate.possibleName,
          confidence: candidate.confidence,
          evidence: candidate.sceneEvidence,
          suggestedProfile: candidate.suggestedCharacterProfile
        }))).onConflictDoNothing();
      }
    });

    await aiRun.succeed({
      usage: extraction.usage,
      fallbackUsed: !env.openRouterApiKey,
      validationStatus: extraction.repaired ? "repaired" : "valid",
      repaired: extraction.repaired
    });
    return ok({ memoryId, memory: extraction.parsed, repaired: extraction.repaired });
  } catch (error) {
    return fail(error);
  }
}
