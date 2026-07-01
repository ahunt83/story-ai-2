import { describe, expect, it } from "vitest";

import { buildStoryFoundationContext } from "./context";
import { createMockStoryFoundation } from "./mock";

describe("buildStoryFoundationContext", () => {
  it("builds a compact context header from the full foundation", () => {
    const foundation = createMockStoryFoundation({
      title: "The Weather Archive",
      initialPrompt: "An archivist discovers that storms are being edited out of history.",
      genreToneNotes: "fantasy mystery"
    });
    foundation.settingAndWorldbuilding.worldRules = ["Edited records can alter public memory."];

    const context = buildStoryFoundationContext(foundation, "draft");

    expect(context.status).toBe("draft");
    expect(context.premise).toContain("storms");
    expect(context.readerPromise).toContain("fantasy mystery");
    expect(context.criticalWorldRules).toContain("Edited records can alter public memory.");
    expect(context.hardConstraints).toContain("Do not treat tentative foundation details as stronger than written chapter canon.");
  });
});
