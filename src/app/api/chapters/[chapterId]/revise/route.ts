import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { aiMessages, draftVersions, scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { createId } from "@/lib/ids";
import { reviseDraft } from "@/lib/story-memory/ai";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { loadChapterBundle } from "../helpers";

const reviseSchema = z.object({
  command: z.string().min(1),
  sceneId: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const input = reviseSchema.parse(await request.json());
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
      query: input.command
    }).catch(() => createMockContext());

    const revisedDraft = await reviseDraft({
      currentDraft: targetScene.draftText,
      command: input.command,
      context: chapterContext
    });

    await db.transaction(async (tx) => {
      await tx.insert(draftVersions).values({
        id: createId("version"),
        sceneId: targetScene.id,
        chapterId,
        source: "revise",
        instruction: input.command,
        content: targetScene.draftText
      });

      await tx.update(scenes).set({ draftText: revisedDraft, updatedAt: new Date() }).where(eq(scenes.id, targetScene.id));
      await tx.insert(aiMessages).values([
        { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "user", content: input.command },
        { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "assistant", content: revisedDraft }
      ]);
    });

    return ok({ draft: revisedDraft, context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}
