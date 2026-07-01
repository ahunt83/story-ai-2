import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { defaultThemePreference, type ThemePreference } from "@/lib/theme";

export async function ensureUserPreferences(userId: string) {
  const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userPreferences)
    .values({
      userId,
      themePreference: defaultThemePreference,
      nsfwMode: false
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const [preference] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (!preference) {
    throw new Error("Could not load user preferences.");
  }

  return preference;
}

export async function updateUserPreferences(userId: string, input: {
  themePreference?: ThemePreference;
  nsfwMode?: boolean;
}) {
  const existing = await ensureUserPreferences(userId);
  const [preference] = await db
    .insert(userPreferences)
    .values({
      userId,
      themePreference: input.themePreference ?? existing.themePreference,
      nsfwMode: input.nsfwMode ?? existing.nsfwMode
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        themePreference: input.themePreference ?? existing.themePreference,
        nsfwMode: input.nsfwMode ?? existing.nsfwMode,
        updatedAt: sql`now()`
      }
    })
    .returning();

  return preference;
}
