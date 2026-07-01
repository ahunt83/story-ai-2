import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { characterImageAssets, characters } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { requireOwnedStory } from "@/lib/ownership";
import { assetStorage, extensionForMediaType } from "@/lib/characters/storage";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

export async function POST(request: Request, context: { params: Promise<{ storyId: string; characterId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, characterId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const [character] = await db.select().from(characters).where(and(eq(characters.storyId, storyId), eq(characters.id, characterId))).limit(1);
    if (!character) throw new Error("Character not found");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Upload requires a file field.");
    if (!allowedTypes.has(file.type)) throw new Error("Upload must be a PNG, JPEG, WebP, GIF, or SVG image.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Character images must be 8 MB or smaller.");

    const id = createId("asset");
    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await assetStorage().put({
      key: `${storyId}/${characterId}/${id}.${extensionForMediaType(file.type)}`,
      bytes,
      mediaType: file.type
    });

    const [asset] = await db.insert(characterImageAssets).values({
      id,
      storyId,
      characterId,
      type: "draft",
      uri: stored.uri,
      storageKey: stored.key,
      mediaType: stored.mediaType,
      generation: { uploadedName: file.name },
      userFeedback: { source: "manual_upload" }
    }).returning();

    return ok({ asset });
  } catch (error) {
    return fail(error);
  }
}
