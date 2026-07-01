import { z } from "zod";

import { completeJson } from "@/lib/openrouter";
import { env } from "@/lib/env";
import type { ResolvedStoryModelSettings } from "@/lib/story-settings";
import { createMockStoryFoundation } from "./mock";
import { buildStoryFoundationPrompt, buildStoryFoundationRepairPrompt } from "./prompts";
import { storyFoundationSchema } from "./schema";

export async function createStoryFoundation(params: {
  title: string;
  initialPrompt: string;
  genreToneNotes?: string | null;
  modelSettings?: ResolvedStoryModelSettings;
}) {
  const fallback = createMockStoryFoundation(params);

  try {
    const result = await completeJson({
      model: params.modelSettings?.extractionModel ?? env.openRouterExtractModel,
      schema: storyFoundationSchema,
      format: {
        name: "StoryFoundation",
        schema: z.toJSONSchema(storyFoundationSchema) as Record<string, unknown>
      },
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: buildStoryFoundationPrompt(params) }
      ],
      fallback
    });
    return { ...result, fallbackUsed: !env.openRouterApiKey };
  } catch (error) {
    if (!env.openRouterApiKey) {
      return { parsed: fallback, raw: JSON.stringify(fallback), repaired: false, fallbackUsed: true, usage: undefined };
    }

    try {
      const repaired = await completeJson({
        model: params.modelSettings?.extractionModel ?? env.openRouterExtractModel,
        schema: storyFoundationSchema,
        format: {
          name: "StoryFoundation",
          schema: z.toJSONSchema(storyFoundationSchema) as Record<string, unknown>
        },
        messages: [
          { role: "system", content: "Repair invalid JSON according to the required schema." },
          { role: "user", content: buildStoryFoundationRepairPrompt(error instanceof Error ? error.message : "Unknown invalid response") }
        ],
        fallback
      });

      return { ...repaired, repaired: true, fallbackUsed: false };
    } catch {
      return { parsed: fallback, raw: JSON.stringify(fallback), repaired: false, fallbackUsed: true, usage: undefined };
    }
  }
}
