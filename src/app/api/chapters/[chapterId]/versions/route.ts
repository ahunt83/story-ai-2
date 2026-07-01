import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { draftVersions, scenes } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { createId } from "@/lib/ids";

const createVersionSchema = z.object({
  sceneId: z.string().min(1),
  instruction: z.string().optional()
});

export async function GET(_request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const versions = await db
      .select()
      .from(draftVersions)
      .where(eq(draftVersions.chapterId, chapterId))
      .orderBy(desc(draftVersions.createdAt));

    return ok({ versions });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const { chapterId } = await context.params;
    const input = createVersionSchema.parse(await request.json());
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, input.sceneId)).limit(1);

    if (!scene || scene.chapterId !== chapterId) {
      return ok({ error: "Scene not found" }, { status: 404 });
    }

    const [version] = await db.insert(draftVersions).values({
      id: createId("version"),
      sceneId: scene.id,
      chapterId,
      source: "manual_snapshot",
      instruction: input.instruction,
      content: scene.draftText
    }).returning();

    return ok({ version }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
