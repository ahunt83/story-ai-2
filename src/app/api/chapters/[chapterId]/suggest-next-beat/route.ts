import { z } from "zod";

import { startAiRun } from "@/lib/ai-runs";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { completeTextWithMetadata } from "@/lib/openrouter";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { resolveStoryModelSettings } from "@/lib/story-settings";
import { chapterTextFromScenes, loadChapterBundle } from "../helpers";

const nextBeatSchema = z.object({
  direction: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const user = await requireUser();
    const { chapterId } = await context.params;
    const input = nextBeatSchema.parse(await request.json().catch(() => ({})));
    const bundle = await loadChapterBundle(chapterId, user.id);
    const modelSettings = await resolveStoryModelSettings(bundle.story.id);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query: input.direction ?? chapterTextFromScenes(bundle.scenes),
      embeddingModel: modelSettings.embeddingModel
    }).catch(() => createMockContext());
    const aiRun = await startAiRun({
      userId: user.id,
      storyId: bundle.story.id,
      chapterId,
      operation: "suggest_next_beat",
      model: modelSettings.chatModel
    });

    const run = await completeTextWithMetadata({
      model: modelSettings.chatModel,
      temperature: modelSettings.generationTemperature,
      maxTokens: Math.min(modelSettings.maxTokens, 900),
      messages: [
        { role: "system", content: "You suggest next story beats while protecting continuity." },
        {
          role: "user",
          content: `Suggest 3 next beats for the current chapter. Keep each beat short and grounded in context.\n\nCURRENT DRAFT:\n${chapterTextFromScenes(bundle.scenes)}\n\nCONTEXT:\n${JSON.stringify(chapterContext, null, 2)}`
        }
      ],
      fallback: "1. Let the mirror reveal one concrete inconsistency.\n2. Force Elias to decide whether Elena is real or remembered.\n3. End the scene on a question that can be tracked as an open thread."
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
