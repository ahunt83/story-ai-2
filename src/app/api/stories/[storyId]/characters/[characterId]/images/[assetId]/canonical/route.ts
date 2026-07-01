import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { characterFieldSources, characterImageAssets, characters } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";
import { applyAcceptedVisualExtraction, normalizeProfile, profileSummaries } from "@/lib/characters/profiles";
import { imageCharacterExtractionSchema } from "@/lib/characters/schema";

const canonicalSchema = z.object({
  acceptVisualExtraction: z.boolean().default(false)
});

export async function POST(request: Request, context: { params: Promise<{ storyId: string; characterId: string; assetId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, characterId, assetId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const input = canonicalSchema.parse(await request.json().catch(() => ({})));
    const [character] = await db.select().from(characters).where(and(eq(characters.storyId, storyId), eq(characters.id, characterId))).limit(1);
    const [asset] = await db.select().from(characterImageAssets).where(and(eq(characterImageAssets.storyId, storyId), eq(characterImageAssets.id, assetId))).limit(1);
    if (!character || !asset || asset.characterId !== characterId) throw new Error("Character image not found");

    let profile = normalizeProfile(character.profile, character.id, character.name);
    const extraction = imageCharacterExtractionSchema.safeParse(asset.extractedVisualDetails);

    if (input.acceptVisualExtraction && extraction.success) {
      profile = applyAcceptedVisualExtraction(profile, extraction.data);
    }

    const summaries = profileSummaries(profile);

    await db.transaction(async (tx) => {
      await tx.update(characterImageAssets).set({
        isPrimary: false,
        type: "draft",
        updatedAt: new Date()
      }).where(and(eq(characterImageAssets.storyId, storyId), eq(characterImageAssets.characterId, characterId)));

      await tx.update(characterImageAssets).set({
        isPrimary: true,
        isCanonical: true,
        type: "canonical_reference",
        updatedAt: new Date()
      }).where(eq(characterImageAssets.id, assetId));

      await tx.update(characters).set({
        primaryImageAssetId: assetId,
        profile,
        canonLevel: input.acceptVisualExtraction ? "mixed" : character.canonLevel,
        ...summaries,
        updatedAt: new Date()
      }).where(eq(characters.id, characterId));

      if (input.acceptVisualExtraction && extraction.success) {
        const visual = extraction.data.suggestedProfileUpdates.visualDesign;
        const sources = Object.entries(visual)
          .filter(([, value]) => value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0))
          .map(([field, value]) => ({
            id: createId("source"),
            storyId,
            characterId,
            fieldPath: `visualDesign.${field}`,
            value: Array.isArray(value) ? value.join(", ") : String(value),
            sourceType: "image_extraction" as const,
            sourceId: assetId,
            confidence: extraction.data.confidence,
            canonStatus: "tentative" as const
          }));
        if (sources.length > 0) {
          await tx.insert(characterFieldSources).values(sources);
        }
      }
    });

    return ok({ character: { ...character, primaryImageAssetId: assetId, profile, ...summaries }, acceptedExtraction: input.acceptVisualExtraction && extraction.success });
  } catch (error) {
    return fail(error);
  }
}
