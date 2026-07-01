import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { characterImageAssets, characters, storyFoundations } from "@/db/schema";
import { startAiRun } from "@/lib/ai-runs";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { requireOwnedStory } from "@/lib/ownership";
import { analyzeCharacterImage } from "@/lib/characters/ai";
import { normalizeProfile } from "@/lib/characters/profiles";
import { buildStoryFoundationContext } from "@/lib/story-foundation/context";
import { storyFoundationSchema } from "@/lib/story-foundation/schema";
import { resolveStoryModelSettings } from "@/lib/story-settings";

export async function POST(_request: Request, context: { params: Promise<{ storyId: string; characterId: string; assetId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, characterId, assetId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const [character] = await db.select().from(characters).where(and(eq(characters.storyId, storyId), eq(characters.id, characterId))).limit(1);
    const [asset] = await db.select().from(characterImageAssets).where(and(eq(characterImageAssets.storyId, storyId), eq(characterImageAssets.id, assetId))).limit(1);
    if (!character || !asset || asset.characterId !== characterId) throw new Error("Character image not found");

    const [foundation] = await db.select().from(storyFoundations).where(eq(storyFoundations.storyId, storyId)).limit(1);
    const parsedFoundation = foundation?.foundation ? storyFoundationSchema.parse(foundation.foundation) : null;
    const storyFoundation = parsedFoundation ? buildStoryFoundationContext(parsedFoundation, foundation.status) : null;
    const modelSettings = await resolveStoryModelSettings(storyId);
    const aiRun = await startAiRun({
      userId: user.id,
      storyId,
      operation: "character_image_analysis",
      model: modelSettings.visionModel,
      metadata: { characterId, assetId }
    });

    const imageInput = await imageInputForAsset(asset);
    const result = await analyzeCharacterImage({
      profile: normalizeProfile(character.profile, character.id, character.name),
      imageUrl: imageInput,
      storyFoundation,
      modelSettings
    }).catch(async (error) => {
      await aiRun.fail(error);
      throw error;
    });

    const [updatedAsset] = await db.update(characterImageAssets).set({
      extractedVisualDetails: result.parsed,
      updatedAt: new Date()
    }).where(eq(characterImageAssets.id, assetId)).returning();

    await aiRun.succeed({ usage: result.usage, fallbackUsed: !env.openRouterApiKey, repaired: result.repaired });
    return ok({ extraction: result.parsed, asset: updatedAsset });
  } catch (error) {
    return fail(error);
  }
}

async function imageInputForAsset(asset: { uri: string; storageKey: string | null; mediaType: string }) {
  if (asset.uri.startsWith("http://") || asset.uri.startsWith("https://") || asset.uri.startsWith("data:")) {
    return asset.uri;
  }

  if (!asset.storageKey) {
    return asset.uri;
  }

  const bytes = await readFile(path.join(path.resolve(env.localAssetRoot), asset.storageKey));
  return `data:${asset.mediaType};base64,${bytes.toString("base64")}`;
}
