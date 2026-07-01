import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { aiRuns } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireOwnedStory } from "@/lib/ownership";

export async function GET(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 30), 1), 100);

    const runs = await db
      .select()
      .from(aiRuns)
      .where(eq(aiRuns.storyId, storyId))
      .orderBy(desc(aiRuns.createdAt))
      .limit(limit);

    return ok({ runs });
  } catch (error) {
    return fail(error);
  }
}
