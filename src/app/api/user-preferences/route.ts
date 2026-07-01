import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { defaultThemePreference, themePreferences } from "@/lib/theme";

const updatePreferenceSchema = z.object({
  themePreference: z.enum(themePreferences)
});

export async function GET() {
  try {
    const user = await requireUser();
    const preference = await ensureUserPreferences(user.id);
    return ok({ userPreferences: preference });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = updatePreferenceSchema.parse(await request.json());
    const [preference] = await db
      .insert(userPreferences)
      .values({
        userId: user.id,
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

async function ensureUserPreferences(userId: string) {
  const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userPreferences)
    .values({
      userId,
      themePreference: defaultThemePreference
    })
    .returning();

  return created;
}
