import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { defaultThemePreference, localUserId, themePreferences } from "@/lib/theme";

const updatePreferenceSchema = z.object({
  themePreference: z.enum(themePreferences)
});

export async function GET() {
  try {
    const preference = await ensureLocalUserPreferences();
    return ok({ userPreferences: preference });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const input = updatePreferenceSchema.parse(await request.json());
    const [preference] = await db
      .insert(userPreferences)
      .values({
        userId: localUserId,
        themePreference: input.themePreference
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          themePreference: input.themePreference,
          updatedAt: sql`now()`
        }
      })
      .returning();

    return ok({ userPreferences: preference });
  } catch (error) {
    return fail(error);
  }
}

async function ensureLocalUserPreferences() {
  const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, localUserId)).limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userPreferences)
    .values({
      userId: localUserId,
      themePreference: defaultThemePreference
    })
    .returning();

  return created;
}
