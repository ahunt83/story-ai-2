import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";

const patchSceneSchema = z.object({
  draftText: z.string().optional(),
  title: z.string().min(1).optional(),
  orderIndex: z.number().int().nonnegative().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ sceneId: string }> }) {
  try {
    const { sceneId } = await context.params;
    const input = patchSceneSchema.parse(await request.json());
    const update = {
      ...input,
      updatedAt: new Date()
    };

    const [scene] = await db
      .update(scenes)
      .set(update)
      .where(eq(scenes.id, sceneId))
      .returning();

    if (!scene) {
      return ok({ error: "Scene not found" }, { status: 404 });
    }

    return ok({ scene });
  } catch (error) {
    return fail(error);
  }
}
