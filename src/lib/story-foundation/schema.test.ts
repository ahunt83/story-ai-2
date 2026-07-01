import { describe, expect, it } from "vitest";

import { createMockStoryFoundation } from "./mock";
import { storyFoundationSchema, validateStoryFoundation } from "./schema";

describe("storyFoundationSchema", () => {
  it("accepts a complete Story Foundation record", () => {
    const foundation = createMockStoryFoundation({
      title: "The Obsidian Echo",
      initialPrompt: "A musician hears tomorrow's disasters in old recordings.",
      genreToneNotes: "literary mystery"
    });

    expect(validateStoryFoundation(foundation).success).toBe(true);
  });

  it("rejects unsupported age categories", () => {
    const foundation = createMockStoryFoundation({
      title: "The Obsidian Echo",
      initialPrompt: "A musician hears tomorrow's disasters in old recordings."
    });
    foundation.audienceAndBoundaries.ageCategory = "all_ages" as never;

    const result = storyFoundationSchema.safeParse(foundation);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes("ageCategory"))).toBe(true);
  });

  it("requires assumptions and gaps", () => {
    const foundation = createMockStoryFoundation({
      title: "The Obsidian Echo",
      initialPrompt: "A musician hears tomorrow's disasters in old recordings."
    }) as Record<string, unknown>;
    delete foundation.assumptionsAndGaps;

    expect(storyFoundationSchema.safeParse(foundation).success).toBe(false);
  });
});
