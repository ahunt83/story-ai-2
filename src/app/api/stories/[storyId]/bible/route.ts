import { eq } from "drizzle-orm";

import { db } from "@/db";
import { storyBibles } from "@/db/schema";
import { fail, ok } from "@/lib/api";

export async function GET(_request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await context.params;
    const [bible] = await db.select().from(storyBibles).where(eq(storyBibles.storyId, storyId)).limit(1);
    return ok({ bible: bible?.bible ?? null, lastUpdatedFromChapterNumber: bible?.lastUpdatedFromChapterNumber ?? 0 });
  } catch (error) {
    return fail(error);
  }
}
