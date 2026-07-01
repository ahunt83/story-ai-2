import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { characterImageAssets, characters } from "@/db/schema";
import { startAiRun } from "@/lib/ai-runs";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";
import { generateCharacterImages } from "@/lib/characters/ai";
import { imageGenerationBriefSchema } from "@/lib/characters/schema";
import { assetStorage, extensionForMediaType } from "@/lib/characters/storage";
import { resolveStoryModelSettings } from "@/lib/story-settings";

const generateSchema = z.object({
  brief: imageGenerationBriefSchema,
  n: z.number().int().min(1).max(4).default(1),
  aspectRatio: z.string().default("3:4"),
  seed: z.number().int().optional()
});

export async function POST(request: Request, context: { params: Promise<{ storyId: string; characterId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, characterId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const input = generateSchema.parse(await request.json());
    const [character] = await db.select().from(characters).where(and(eq(characters.storyId, storyId), eq(characters.id, characterId))).limit(1);
    if (!character) throw new Error("Character not found");

    const modelSettings = await resolveStoryModelSettings(storyId);
    const aiRun = await startAiRun({
      userId: user.id,
      storyId,
      operation: "character_image_generation",
      model: modelSettings.imageModel,
      metadata: { characterId, n: input.n }
    });

    const generated = await generateCharacterImages({
      brief: input.brief,
      modelSettings,
      n: input.n,
      aspectRatio: input.aspectRatio,
      seed: input.seed
    }).catch(async (error) => {
      await aiRun.fail(error);
      throw error;
    });

    const storage = assetStorage();
    const createdAssets = [];
    for (const image of generated.images) {
      const bytes = Buffer.from(image.b64Json, "base64");
      const id = createId("asset");
      const ext = extensionForMediaType(image.mediaType);
      const stored = await storage.put({
        key: `${storyId}/${characterId}/${id}.${ext}`,
        bytes,
        mediaType: image.mediaType
      });
      const [asset] = await db.insert(characterImageAssets).values({
        id,
        storyId,
        characterId,
        type: "draft",
        uri: stored.uri,
        storageKey: stored.key,
        mediaType: stored.mediaType,
        imageModel: modelSettings.imageModel,
        prompt: input.brief.imagePrompt,
        negativePrompt: input.brief.negativePrompt,
        seed: input.seed === undefined ? undefined : String(input.seed),
        aspectRatio: input.aspectRatio,
        generation: {
          brief: input.brief,
          usage: generated.usage,
          fallbackUsed: generated.fallbackUsed
        }
      }).returning();
      createdAssets.push(asset);
    }

    await aiRun.succeed({ usage: generated.usage, fallbackUsed: generated.fallbackUsed, metadata: { assets: createdAssets.length } });
    return ok({ assets: createdAssets, fallbackUsed: generated.fallbackUsed });
  } catch (error) {
    return fail(error);
  }
}
