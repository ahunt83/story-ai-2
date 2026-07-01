import { describe, expect, it } from "vitest";

import { sampleMemory } from "@/lib/sample-data";
import { createMockContext } from "./mock";
import { extractChapterMemory, mergeStoryBible, streamGenerateDraftRun, streamReviseDraftRun } from "./ai";

describe("story-memory AI fallbacks", () => {
  it("returns valid mock extraction when OpenRouter is not configured", async () => {
    const result = await extractChapterMemory({
      chapterText: "A clean chapter text with a mirror and a promise.",
      chapterNumber: 2,
      title: "The Promise"
    });

    expect(result.parsed.chapterMetadata.chapterNumber).toBe(2);
    expect(result.parsed.summaries.shortSummary).toBeTruthy();
  });

  it("merges chapter memory into a local story bible fallback", async () => {
    const result = await mergeStoryBible({
      existingStoryBible: null,
      chapterMemory: sampleMemory
    });

    expect(result.parsed.updatedFromChapterNumber).toBe(sampleMemory.chapterMetadata.chapterNumber);
    expect(result.parsed.openThreads.length).toBeGreaterThan(0);
  });

  it("streams fallback generation text when OpenRouter is not configured", async () => {
    const chunks: string[] = [];

    for await (const event of streamGenerateDraftRun({
      storyTitle: "The Test Story",
      direction: "Draft a tense opening.",
      context: createMockContext()
    })) {
      if (event.type === "delta") chunks.push(event.content);
    }

    expect(chunks.join("")).toContain("The page waited");
  });

  it("streams fallback revision text when OpenRouter is not configured", async () => {
    const chunks: string[] = [];

    for await (const event of streamReviseDraftRun({
      currentDraft: "The room was quiet.",
      command: "Make it stranger.",
      context: createMockContext()
    })) {
      if (event.type === "delta") chunks.push(event.content);
    }

    expect(chunks.join("")).toContain("Revision note applied locally");
  });
});
