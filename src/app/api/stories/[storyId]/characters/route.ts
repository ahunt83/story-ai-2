import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { characterCandidates, characterFieldSources, characterImageAssets, characters, storyFoundations } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";
import { createCharacterProfile, normalizeProfile, profileSummaries } from "@/lib/characters/profiles";
import { characterCreatedFromSchema, characterImportanceSchema, characterProfileSchema, characterStatusSchema } from "@/lib/characters/schema";
import { storyFoundationSchema } from "@/lib/story-foundation/schema";

const createCharacterSchema = z.object({
  name: z.string().min(1),
  createdFrom: characterCreatedFromSchema.default("manual"),
  importance: characterImportanceSchema.default("supporting"),
  roleInStory: z.string().optional(),
  visualSeed: z.string().optional(),
  voiceSeed: z.string().optional(),
  profile: characterProfileSchema.optional()
});

export async function GET(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();

    const filters = [
      eq(characters.storyId, storyId),
      query ? or(ilike(characters.name, `%${query}%`), ilike(characters.visualSummary, `%${query}%`), ilike(characters.voiceSummary, `%${query}%`)) : undefined
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(characters)
      .where(and(...filters))
      .orderBy(desc(characters.updatedAt));
    const assets = rows.length > 0
      ? await db.select().from(characterImageAssets).where(eq(characterImageAssets.storyId, storyId)).orderBy(desc(characterImageAssets.createdAt))
      : [];
    const sources = rows.length > 0
      ? await db.select().from(characterFieldSources).where(eq(characterFieldSources.storyId, storyId)).orderBy(desc(characterFieldSources.createdAt))
      : [];
    const candidates = await db
      .select()
      .from(characterCandidates)
      .where(eq(characterCandidates.storyId, storyId))
      .orderBy(desc(characterCandidates.createdAt));
    const [foundation] = await db.select().from(storyFoundations).where(eq(storyFoundations.storyId, storyId)).limit(1);
    const foundationStubs = foundation?.foundation
      ? foundationCharacters(storyFoundationSchema.parse(foundation.foundation).characters)
      : [];

    return ok({
      characters: rows.map((row) => ({
        ...row,
        profile: normalizeProfile(row.profile, row.id, row.name),
        imageAssets: assets.filter((asset) => asset.characterId === row.id),
        fieldSources: sources.filter((source) => source.characterId === row.id)
      })),
      candidates,
      foundationStubs
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const input = createCharacterSchema.parse(await request.json());
    const id = input.profile?.id ?? createId("char");
    const profile = characterProfileSchema.parse(input.profile ?? createCharacterProfile({
      id,
      name: input.name,
      createdFrom: input.createdFrom,
      importance: input.importance,
      roleInStory: input.roleInStory,
      visualSeed: input.visualSeed,
      voiceSeed: input.voiceSeed,
      sourceNote: input.createdFrom === "story_foundation" ? "Created from Story Foundation character stub." : undefined
    }));
    const summaries = profileSummaries(profile);

    const [created] = await db.insert(characters).values({
      id,
      storyId,
      name: profile.name,
      displayName: profile.displayName,
      aliases: profile.aliasesOrTitles,
      status: profile.status,
      importance: profile.importance,
      createdFrom: profile.createdFrom,
      canonLevel: profile.canonLevel,
      profile,
      ...summaries
    }).returning();

    await db.insert(characterFieldSources).values({
      id: createId("source"),
      storyId,
      characterId: id,
      fieldPath: "name",
      value: profile.name,
      sourceType: input.createdFrom === "story_foundation" ? "story_foundation" : "user_entered",
      canonStatus: "tentative"
    });

    return ok({ character: { ...created, profile } });
  } catch (error) {
    return fail(error);
  }
}

function foundationCharacters(items: Array<Record<string, unknown> | string>) {
  return items.map((item, index) => {
    if (typeof item === "string") {
      return {
        temporaryId: `foundation_stub_${index + 1}`,
        name: item,
        importance: "supporting",
        role: "",
        briefDescription: item,
        visualSeed: "",
        voiceSeed: ""
      };
    }

    const name = String(item.name ?? item.character_name ?? item.display_name ?? `Character ${index + 1}`);
    return {
      temporaryId: String(item.temporary_id ?? item.id ?? `foundation_stub_${index + 1}`),
      name,
      importance: normalizeImportance(String(item.importance ?? item.role_importance ?? "supporting")),
      role: String(item.role ?? item.role_in_story ?? item.story_function ?? ""),
      briefDescription: String(item.brief_description ?? item.description ?? item.summary ?? ""),
      visualSeed: String(item.visual_seed ?? item.appearance ?? item.visual_description ?? ""),
      voiceSeed: String(item.voice_seed ?? item.voice ?? item.dialogue_style ?? "")
    };
  });
}

function normalizeImportance(value: string) {
  if (["protagonist", "major", "supporting", "minor", "background"].includes(value)) {
    return value;
  }
  if (value === "critical") return "major";
  return "supporting";
}
