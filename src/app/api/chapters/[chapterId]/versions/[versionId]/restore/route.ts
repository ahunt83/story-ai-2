import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { draftVersions, scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { createId } from "@/lib/ids";

export async function POST(_request: Request, context: { params: Promise<{ chapterId: string; versionId: string }> }) {
  try {
    const { chapterId, versionId } = await context.params;
    const [version] = await db
      .select()
      .from(draftVersions)
      .where(and(eq(draftVersions.id, versionId), eq(draftVersions.chapterId, chapterId)))
      .limit(1);

    if (!version?.sceneId) {
      return ok({ error: "Version not found" }, { status: 404 });
    }

    const [scene] = await db.select().from(scenes).where(eq(scenes.id, version.sceneId)).limit(1);
    if (!scene) {
      return ok({ error: "Scene not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.insert(draftVersions).values({
        id: createId("version"),
        sceneId: scene.id,
        chapterId,
        source: "restore_snapshot",
        instruction: `Before restoring ${version.id}`,
        content: scene.draftText
      });

      await tx.update(scenes).set({
        draftText: version.content,
        updatedAt: new Date()
      }).where(eq(scenes.id, scene.id));
    });

    return ok({ restoredSceneId: scene.id, draftText: version.content });
  } catch (error) {
    return fail(error);
  }
}
