import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { characterFieldSources, characters } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";
import { normalizeProfile, profileSummaries } from "@/lib/characters/profiles";
import { characterProfileSchema } from "@/lib/characters/schema";

const patchCharacterSchema = z.object({
  profile: characterProfileSchema,
  confirmedFields: z.array(z.object({
    fieldPath: z.string(),
    value: z.string()
  })).default([])
});

export async function GET(_request: Request, context: { params: Promise<{ storyId: string; characterId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, characterId } = await context.params;
    await requireOwnedStory(storyId, user.id);

    const [row] = await db.select().from(characters).where(and(eq(characters.storyId, storyId), eq(characters.id, characterId))).limit(1);
    if (!row) throw new Error("Character not found");

    return ok({ character: { ...row, profile: normalizeProfile(row.profile, row.id, row.name) } });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ storyId: string; characterId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, characterId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const input = patchCharacterSchema.parse(await request.json());
    const profile = { ...input.profile, id: characterId };
    const summaries = profileSummaries(profile);

    const [updated] = await db.update(characters).set({
      name: profile.name,
      displayName: profile.displayName,
      aliases: profile.aliasesOrTitles,
      status: profile.status,
      importance: profile.importance,
      createdFrom: profile.createdFrom,
      canonLevel: input.confirmedFields.length > 0 ? "mixed" : profile.canonLevel,
      profile,
      ...summaries,
      updatedAt: new Date()
    }).where(and(eq(characters.storyId, storyId), eq(characters.id, characterId))).returning();

    if (!updated) throw new Error("Character not found");

    if (input.confirmedFields.length > 0) {
      await db.insert(characterFieldSources).values(input.confirmedFields.map((field) => ({
        id: createId("source"),
        storyId,
        characterId,
        fieldPath: field.fieldPath,
        value: field.value,
        sourceType: "user_confirmed" as const,
        canonStatus: "confirmed" as const
      })));
    }

    return ok({ character: { ...updated, profile } });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ storyId: string; characterId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, characterId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    await db.delete(characters).where(and(eq(characters.storyId, storyId), eq(characters.id, characterId)));
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
