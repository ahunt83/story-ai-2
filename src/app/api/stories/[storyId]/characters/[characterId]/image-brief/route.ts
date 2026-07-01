import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { characters, storyFoundations } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireOwnedStory } from "@/lib/ownership";
import { createImageGenerationBrief, reviseImageGenerationBrief } from "@/lib/characters/ai";
import { normalizeProfile } from "@/lib/characters/profiles";
import { buildStoryFoundationContext } from "@/lib/story-foundation/context";
import { storyFoundationSchema } from "@/lib/story-foundation/schema";
import { resolveStoryModelSettings } from "@/lib/story-settings";

const briefSchema = z.object({
  userRequest: z.string().optional(),
  previousPrompt: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ storyId: string; characterId: string }> }) {
  try {
    const user = await requireUser();
    const { storyId, characterId } = await context.params;
    await requireOwnedStory(storyId, user.id);
    const input = briefSchema.parse(await request.json().catch(() => ({})));
    const [row] = await db.select().from(characters).where(and(eq(characters.storyId, storyId), eq(characters.id, characterId))).limit(1);
    if (!row) throw new Error("Character not found");

    const profile = normalizeProfile(row.profile, row.id, row.name);
    const [foundation] = await db.select().from(storyFoundations).where(eq(storyFoundations.storyId, storyId)).limit(1);
    const parsedFoundation = foundation?.foundation ? storyFoundationSchema.parse(foundation.foundation) : null;
    const contextFoundation = parsedFoundation ? buildStoryFoundationContext(parsedFoundation, foundation.status) : null;
    const modelSettings = await resolveStoryModelSettings(storyId);
    const result = input.previousPrompt
      ? await reviseImageGenerationBrief({ profile, previousPrompt: input.previousPrompt, userFeedback: input.userRequest ?? "", modelSettings })
      : await createImageGenerationBrief({ profile, storyFoundation: contextFoundation, userRequest: input.userRequest, modelSettings });

    return ok({ brief: result.parsed, raw: result.raw, fallbackUsed: !process.env.OPENROUTER_API_KEY });
  } catch (error) {
    return fail(error);
  }
}
