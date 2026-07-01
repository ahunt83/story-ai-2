import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { characterCandidates, characterFieldSources, characters } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";
import { createCharacterProfile, normalizeProfile, profileSummaries } from "@/lib/characters/profiles";
import { characterProfileSchema } from "@/lib/characters/schema";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add") }),
  z.object({ action: z.literal("merge"), characterId: z.string().min(1) }),
  z.object({ action: z.literal("ignore") }),
  z.object({ action: z.literal("background") })
]);

export async function POST(request: Request, context: { params: Promise<{ storyId: string; candidateId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, candidateId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const input = actionSchema.parse(await request.json());
    const [candidate] = await db.select().from(characterCandidates).where(and(eq(characterCandidates.storyId, storyId), eq(characterCandidates.id, candidateId))).limit(1);
    if (!candidate) throw new Error("Character candidate not found");

    if (input.action === "ignore" || input.action === "background") {
      const [updated] = await db.update(characterCandidates).set({
        status: input.action === "ignore" ? "ignored" : "background",
        updatedAt: new Date()
      }).where(eq(characterCandidates.id, candidateId)).returning();
      return ok({ candidate: updated });
    }

    if (input.action === "merge") {
      const [target] = await db.select().from(characters).where(and(eq(characters.storyId, storyId), eq(characters.id, input.characterId))).limit(1);
      if (!target) throw new Error("Target character not found");
      const profile = normalizeProfile(target.profile, target.id, target.name);
      const evidenceNote = evidenceSummary(candidate.evidence);
      const merged = characterProfileSchema.parse({
        ...profile,
        sourceTracking: {
          ...profile.sourceTracking,
          sceneEstablishedFacts: [...profile.sourceTracking.sceneEstablishedFacts, evidenceNote].filter(Boolean)
        }
      });
      const summaries = profileSummaries(merged);

      await db.transaction(async (tx) => {
        await tx.update(characters).set({
          profile: merged,
          ...summaries,
          updatedAt: new Date()
        }).where(eq(characters.id, target.id));
        await tx.update(characterCandidates).set({
          status: "merged",
          resolvedCharacterId: target.id,
          updatedAt: new Date()
        }).where(eq(characterCandidates.id, candidateId));
        await tx.insert(characterFieldSources).values({
          id: createId("source"),
          storyId,
          characterId: target.id,
          fieldPath: "sourceTracking.sceneEstablishedFacts",
          value: evidenceNote || candidate.possibleName,
          sourceType: "scene_extraction",
          sourceId: candidateId,
          confidence: candidate.confidence,
          canonStatus: "tentative"
        });
      });

      return ok({ character: { ...target, profile: merged, ...summaries } });
    }

    const characterId = createId("char");
    const suggested = characterProfileSchema.safeParse(candidate.suggestedProfile);
    const profile = suggested.success ? characterProfileSchema.parse({
      ...suggested.data,
      id: characterId,
      name: suggested.data.name || candidate.possibleName,
      createdFrom: "chapter_extraction",
      canonLevel: "mixed"
    }) : createCharacterProfile({
      id: characterId,
      name: candidate.possibleName,
      createdFrom: "chapter_extraction",
      importance: "supporting",
      roleInStory: String((candidate.suggestedProfile as Record<string, unknown>).story_function ?? ""),
      sourceNote: evidenceSummary(candidate.evidence)
    });
    const summaries = profileSummaries(profile);

    await db.transaction(async (tx) => {
      await tx.insert(characters).values({
        id: characterId,
        storyId,
        name: profile.name,
        displayName: profile.displayName,
        aliases: profile.aliasesOrTitles,
        status: "draft",
        importance: profile.importance,
        createdFrom: "chapter_extraction",
        canonLevel: "mixed",
        profile,
        ...summaries
      });
      await tx.update(characterCandidates).set({
        status: "added",
        resolvedCharacterId: characterId,
        updatedAt: new Date()
      }).where(eq(characterCandidates.id, candidateId));
      await tx.insert(characterFieldSources).values({
        id: createId("source"),
        storyId,
        characterId,
        fieldPath: "name",
        value: profile.name,
        sourceType: "chapter_extraction",
        sourceId: candidateId,
        confidence: candidate.confidence,
        canonStatus: "tentative"
      });
    });

    return ok({ character: { id: characterId, storyId, ...summaries, profile } });
  } catch (error) {
    return fail(error);
  }
}

function evidenceSummary(evidence: unknown) {
  if (!evidence || typeof evidence !== "object") return "";
  const record = evidence as Record<string, unknown>;
  return String(record.first_appearance_summary ?? record.firstAppearanceSummary ?? record.dialogue_or_voice_notes ?? record.appearance_described ?? "");
}
