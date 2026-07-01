import { describe, expect, it } from "vitest";

import { createMockStoryFoundation } from "@/lib/story-foundation/mock";
import { storyFoundationSuggestsNsfw, textSuggestsNsfw } from "./nsfw";

describe("NSFW detection", () => {
  it("detects explicit sexual story prompts", () => {
    expect(textSuggestsNsfw("An open-door erotic romance with explicit sex scenes.")).toBe(true);
  });

  it("does not mark closed-door romance as NSFW", () => {
    expect(textSuggestsNsfw("A slow-burn romance with fade-to-black intimacy.")).toBe(false);
  });

  it("detects Story Foundation sexual content level markers", () => {
    const foundation = createMockStoryFoundation({
      title: "Velvet Signals",
      initialPrompt: "A romance between rival spies.",
      genreToneNotes: "romantic thriller"
    });
    foundation.audienceAndBoundaries.sexualContentLevel = "Explicit sexual content (NSFW), open-door.";

    expect(storyFoundationSuggestsNsfw(foundation)).toBe(true);
  });
});
