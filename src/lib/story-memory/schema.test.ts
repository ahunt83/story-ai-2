import { describe, expect, it } from "vitest";

import { sampleMemory } from "@/lib/sample-data";
import { chapterMemorySchema, validateChapterMemory } from "./schema";

describe("chapterMemorySchema", () => {
  it("accepts a complete ChapterMemory record", () => {
    expect(validateChapterMemory(sampleMemory).success).toBe(true);
  });

  it("rejects invalid importance enum values", () => {
    const invalid = structuredClone(sampleMemory);
    invalid.canonFactsEstablished[0].importance = "urgent" as never;

    const result = chapterMemorySchema.safeParse(invalid);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes("importance"))).toBe(true);
  });

  it("requires all three summary lengths to be non-empty", () => {
    const invalid = structuredClone(sampleMemory);
    invalid.summaries.shortSummary = "";

    const result = chapterMemorySchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });
});
