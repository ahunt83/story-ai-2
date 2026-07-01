import { z } from "zod";

import { fail, ok } from "@/lib/api";
import { completeText } from "@/lib/openrouter";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { chapterTextFromScenes, loadChapterBundle } from "../helpers";

const nextBeatSchema = z.object({
  direction: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const input = nextBeatSchema.parse(await request.json().catch(() => ({})));
    const bundle = await loadChapterBundle(chapterId);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query: input.direction ?? chapterTextFromScenes(bundle.scenes)
    }).catch(() => createMockContext());

    const result = await completeText({
      messages: [
        { role: "system", content: "You suggest next story beats while protecting continuity." },
        {
          role: "user",
          content: `Suggest 3 next beats for the current chapter. Keep each beat short and grounded in context.\n\nCURRENT DRAFT:\n${chapterTextFromScenes(bundle.scenes)}\n\nCONTEXT:\n${JSON.stringify(chapterContext, null, 2)}`
        }
      ],
      fallback: "1. Let the mirror reveal one concrete inconsistency.\n2. Force Elias to decide whether Elena is real or remembered.\n3. End the scene on a question that can be tracked as an open thread."
    });

    return ok({ result, context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}
