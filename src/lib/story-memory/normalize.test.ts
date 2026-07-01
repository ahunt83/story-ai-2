import { describe, expect, it } from "vitest";

import { sampleMemory } from "@/lib/sample-data";
import { normalizeChapterMemory } from "./normalize";

describe("normalizeChapterMemory", () => {
  it("extracts searchable memory rows from important sections", () => {
    const items = normalizeChapterMemory(sampleMemory);

    expect(items.length).toBeGreaterThan(0);
    expect(items.map((item) => item.category)).toContain("canon_fact");
    expect(items.map((item) => item.category)).toContain("character_state");
    expect(items.map((item) => item.category)).toContain("open_thread");
    expect(items.every((item) => item.content.length > 0)).toBe(true);
  });
});
