import { eq } from "drizzle-orm";

import { db } from "@/db";
import { stories, storyModelSettings } from "@/db/schema";
import { storyFoundationSuggestsNsfw } from "@/lib/nsfw";
import type { StoryFoundation } from "@/lib/story-foundation/schema";
import { defaultStoryModelSettings } from "@/lib/story-settings";
import { ensureUserPreferences, updateUserPreferences } from "@/lib/user-preferences";

export async function applyFoundationNsfwPolicy(params: {
  storyId: string;
  userId: string;
  foundation: StoryFoundation;
}) {
  if (!storyFoundationSuggestsNsfw(params.foundation)) {
    return false;
  }

  const [story] = await db
    .select({ isNsfw: stories.isNsfw })
    .from(stories)
    .where(eq(stories.id, params.storyId))
    .limit(1);

  if (!story?.isNsfw) {
    const modelSettings = defaultStoryModelSettings({ nsfw: true });
    await db.transaction(async (tx) => {
      await tx.update(stories).set({ isNsfw: true, updatedAt: new Date() }).where(eq(stories.id, params.storyId));
      await tx
        .update(storyModelSettings)
        .set({ ...modelSettings, updatedAt: new Date() })
        .where(eq(storyModelSettings.storyId, params.storyId));
    });
  }

  const preferences = await ensureUserPreferences(params.userId);
  if (!preferences.nsfwMode) {
    await updateUserPreferences(params.userId, { nsfwMode: true });
  }

  return true;
}
