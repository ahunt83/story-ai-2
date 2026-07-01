import { z } from "zod";

import { fail, ok } from "@/lib/api";
import { completeText } from "@/lib/openrouter";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { chapterTextFromScenes, loadChapterBundle } from "../helpers";

const memoryCheckSchema = z.object({
  focus: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const input = memoryCheckSchema.parse(await request.json().catch(() => ({})));
    const bundle = await loadChapterBundle(chapterId);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query: input.focus ?? chapterTextFromScenes(bundle.scenes)
    }).catch(() => createMockContext());

    const result = await completeText({
      messages: [
        { role: "system", content: "You are a continuity editor. Return concise actionable notes." },
        {
          role: "user",
          content: `Check this draft against the context package. Identify contradictions, missing payoffs, and useful memory reminders.\n\nDRAFT:\n${chapterTextFromScenes(bundle.scenes)}\n\nCONTEXT:\n${JSON.stringify(chapterContext, null, 2)}`
        }
      ],
      fallback: "No live model configured. Local check: review character location, open threads, and any object facts before approval."
    });

    return ok({ result, context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}
