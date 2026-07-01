import { describe, expect, it } from "vitest";

import { sampleMemory } from "@/lib/sample-data";
import { approvedMemory, reviewKey } from "./approval";

describe("approvedMemory", () => {
  it("omits excluded review items from commit payload", () => {
    const memory = approvedMemory(sampleMemory, {
      [reviewKey("canonFactsEstablished", 0)]: false,
      [reviewKey("characterStates", 0)]: false,
      [reviewKey("openThreads", 0)]: false,
      [reviewKey("continuityWarnings", 0)]: false,
      [reviewKey("doNotForget", 0)]: false
    });

    expect(memory.canonFactsEstablished).toHaveLength(Math.max(sampleMemory.canonFactsEstablished.length - 1, 0));
    expect(memory.characterStates).toHaveLength(Math.max(sampleMemory.characterStates.length - 1, 0));
    expect(memory.openThreads).toHaveLength(Math.max(sampleMemory.openThreads.length - 1, 0));
    expect(memory.continuityWarnings).toHaveLength(Math.max(sampleMemory.continuityWarnings.length - 1, 0));
    expect(memory.doNotForget).toHaveLength(Math.max(sampleMemory.doNotForget.length - 1, 0));
  });
});
