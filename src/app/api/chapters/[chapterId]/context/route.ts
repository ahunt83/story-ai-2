import { fail, ok } from "@/lib/api";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { loadChapterBundle } from "../helpers";

export async function GET(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? undefined;
    const bundle = await loadChapterBundle(chapterId);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query
    });

    return ok({ context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}
