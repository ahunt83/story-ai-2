import { z } from "zod";

import { startAiRun } from "@/lib/ai-runs";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { completeTextWithMetadata } from "@/lib/openrouter";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { resolveStoryModelSettings } from "@/lib/story-settings";
import { chapterTextFromScenes, loadChapterBundle } from "../helpers";

const memoryCheckSchema = z.object({
  focus: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const user = await requireUser();
    const { chapterId } = await context.params;
    const input = memoryCheckSchema.parse(await request.json().catch(() => ({})));
    const bundle = await loadChapterBundle(chapterId, user.id);
    const modelSettings = await resolveStoryModelSettings(bundle.story.id);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query: input.focus ?? chapterTextFromScenes(bundle.scenes),
      embeddingModel: modelSettings.embeddingModel
    }).catch(() => createMockContext());
    const aiRun = await startAiRun({
      userId: user.id,
      storyId: bundle.story.id,
      chapterId,
      operation: "memory_check",
      model: modelSettings.chatModel
    });

    const run = await completeTextWithMetadata({
      model: modelSettings.chatModel,
      temperature: 0.2,
      maxTokens: modelSettings.maxTokens,
      messages: [
        { role: "system", content: "You are a continuity editor. Return concise actionable notes." },
        {
          role: "user",
          content: `Check this draft against the context package. Identify contradictions, missing payoffs, and useful memory reminders.\n\nDRAFT:\n${chapterTextFromScenes(bundle.scenes)}\n\nCONTEXT:\n${JSON.stringify(chapterContext, null, 2)}`
        }
      ],
      fallback: "No live model configured. Local check: review character location, open threads, and any object facts before approval."
    }).catch(async (error) => {
      await aiRun.fail(error);
      throw error;
    });

    await aiRun.succeed({ usage: run.usage, fallbackUsed: run.fallbackUsed });
    return ok({ result: run.content, context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}
