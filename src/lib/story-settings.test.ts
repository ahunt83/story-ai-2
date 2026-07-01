import { describe, expect, it } from "vitest";

import { env } from "@/lib/env";
import { defaultStoryModelSettings } from "./story-settings";

describe("story model settings", () => {
  it("uses environment models as story defaults", () => {
    expect(defaultStoryModelSettings()).toEqual({
      chatModel: env.openRouterChatModel,
      revisionModel: env.openRouterChatModel,
      extractionModel: env.openRouterExtractModel,
      embeddingModel: env.openRouterEmbeddingModel,
      imageModel: env.openRouterImageModel,
      visionModel: env.openRouterVisionModel,
      generationTemperature: 0.8,
      revisionTemperature: 0.7,
      maxTokens: 1800
    });
  });

  it("uses NSFW-friendly models for NSFW story defaults", () => {
    expect(defaultStoryModelSettings({ nsfw: true })).toEqual({
      chatModel: env.openRouterNsfwChatModel,
      revisionModel: env.openRouterNsfwRevisionModel,
      extractionModel: env.openRouterNsfwExtractModel,
      embeddingModel: env.openRouterEmbeddingModel,
      imageModel: env.openRouterImageModel,
      visionModel: env.openRouterVisionModel,
      generationTemperature: 0.8,
      revisionTemperature: 0.7,
      maxTokens: 1800
    });
  });
});
