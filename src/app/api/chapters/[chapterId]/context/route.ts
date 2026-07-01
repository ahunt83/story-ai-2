import { fail, ok } from "@/lib/api";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { loadChapterBundle } from "../helpers";

export async function GET(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? undefined;
    const characters = splitList(url.searchParams.get("characters"));
    const categories = splitList(url.searchParams.get("categories"));
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 12), 1), 30);
    const bundle = await loadChapterBundle(chapterId);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query,
      characters,
      categories,
      limit
    });

    return ok({ context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}

function splitList(value: string | null) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean);
}
