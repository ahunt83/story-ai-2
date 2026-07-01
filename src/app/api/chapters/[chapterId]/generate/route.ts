import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { aiMessages, draftVersions, scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { createId } from "@/lib/ids";
import { OpenRouterRequestError } from "@/lib/openrouter";
import { generateDraftRun } from "@/lib/story-memory/ai";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { loadChapterBundle } from "../helpers";

const generateSchema = z.object({
  direction: z.string().min(1),
  sceneId: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const input = generateSchema.parse(await request.json());
    const bundle = await loadChapterBundle(chapterId);
    const targetScene = input.sceneId
      ? bundle.scenes.find((scene) => scene.id === input.sceneId)
      : bundle.scenes[0];

    if (!targetScene) {
      throw new Error("Scene not found");
    }

    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query: input.direction
    }).catch(() => createMockContext());

    let run: Awaited<ReturnType<typeof generateDraftRun>>;
    try {
      run = await generateDraftRun({
        storyTitle: bundle.story.title,
        direction: input.direction,
        context: chapterContext
      });
    } catch (error) {
      await db.insert(aiMessages).values({
        id: createId("msg"),
        storyId: bundle.story.id,
        chapterId,
        role: "assistant",
        content: error instanceof Error ? error.message : "Generation failed",
        metadata: {
          status: "failed",
          kind: "generate",
          providerStatus: error instanceof OpenRouterRequestError ? error.status : undefined
        }
      });
      throw error;
    }

    const draft = run.content;

    await db.transaction(async (tx) => {
      if (targetScene.draftText) {
        await tx.insert(draftVersions).values({
          id: createId("version"),
          sceneId: targetScene.id,
          chapterId,
          source: "generate",
          instruction: input.direction,
          content: targetScene.draftText
        });
      }

      await tx.update(scenes).set({ draftText: draft, updatedAt: new Date() }).where(eq(scenes.id, targetScene.id));
      await tx.insert(aiMessages).values([
        { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "user", content: input.direction },
        { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "assistant", content: draft, metadata: { kind: "generate", usage: run.usage, fallbackUsed: run.fallbackUsed } }
      ]);
    });

    return ok({ draft, context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}
