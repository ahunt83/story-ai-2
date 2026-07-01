import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { aiMessages, draftVersions, scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { createId } from "@/lib/ids";
import { loadChapterBundle } from "../helpers";

const applyRevisionSchema = z.object({
  sceneId: z.string().min(1),
  command: z.string().min(1),
  draft: z.string().min(1),
  generationId: z.string().optional(),
  fallbackUsed: z.boolean().optional(),
  usage: z.object({
    prompt_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
    total_tokens: z.number().optional()
  }).optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const user = await requireUser();
    const { chapterId } = await context.params;
    const input = applyRevisionSchema.parse(await request.json());
    const bundle = await loadChapterBundle(chapterId, user.id);
    const targetScene = bundle.scenes.find((scene) => scene.id === input.sceneId);

    if (!targetScene) {
      throw new Error("Scene not found");
    }

    await db.transaction(async (tx) => {
      await tx.insert(draftVersions).values({
        id: createId("version"),
        sceneId: targetScene.id,
        chapterId,
        source: "revise",
        instruction: input.command,
        content: targetScene.draftText
      });

      await tx.update(scenes).set({ draftText: input.draft, updatedAt: new Date() }).where(eq(scenes.id, targetScene.id));
      await tx.insert(aiMessages).values([
        { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "user", content: input.command },
        {
          id: createId("msg"),
          storyId: bundle.story.id,
          chapterId,
          role: "assistant",
          content: input.draft,
          metadata: {
            kind: "revise",
            usage: input.usage,
            fallbackUsed: input.fallbackUsed ?? !env.openRouterApiKey,
            generationId: input.generationId
          }
        }
      ]);
    });

    return ok({ draft: input.draft });
  } catch (error) {
    return fail(error);
  }
}
