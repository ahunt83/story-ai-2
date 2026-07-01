import { describe, expect, it } from "vitest";

import { createStoryFoundation } from "./ai";
import { storyFoundationSchema } from "./schema";

describe("story foundation AI fallback", () => {
  it("returns valid foundation JSON without OpenRouter", async () => {
    const result = await createStoryFoundation({
      title: "The Weather Archive",
      initialPrompt: "An archivist discovers that storms are being edited out of history.",
      genreToneNotes: "fantasy mystery, atmospheric"
    });

    expect(storyFoundationSchema.safeParse(result.parsed).success).toBe(true);
    expect(result.parsed.coreConcept.readerPromise).toContain("fantasy mystery");
  });
});
