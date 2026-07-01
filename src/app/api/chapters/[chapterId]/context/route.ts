import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { resolveStoryModelSettings } from "@/lib/story-settings";
import { loadChapterBundle } from "../helpers";

export async function GET(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const user = await requireUser();
    const { chapterId } = await context.params;
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? undefined;
    const characters = splitList(url.searchParams.get("characters"));
    const categories = splitList(url.searchParams.get("categories"));
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 12), 1), 30);
    const bundle = await loadChapterBundle(chapterId, user.id);
    const modelSettings = await resolveStoryModelSettings(bundle.story.id);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query,
      characters,
      categories,
      limit,
      embeddingModel: modelSettings.embeddingModel
    });

    return ok({ context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}

function splitList(value: string | null) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean);
}
