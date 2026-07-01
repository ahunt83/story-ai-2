import { describe, expect, it } from "vitest";

import { applyAcceptedVisualExtraction, compactCharacterContext, createCharacterProfile } from "./profiles";

describe("character profiles", () => {
  it("creates a default profile from a manual character seed", () => {
    const profile = createCharacterProfile({
      id: "char_test",
      name: "Mara Quill",
      createdFrom: "manual",
      visualSeed: "Sharp-eyed archive thief",
      voiceSeed: "Wry and guarded"
    });

    expect(profile.name).toBe("Mara Quill");
    expect(profile.visualDesign.descriptionForImageGeneration).toBe("Sharp-eyed archive thief");
    expect(profile.voice.dialogueStyle).toBe("Wry and guarded");
    expect(profile.canonLevel).toBe("tentative");
  });

  it("keeps image-derived visual details tentative until accepted by the user", () => {
    const profile = createCharacterProfile({ id: "char_test", name: "Mara Quill" });
    const updated = applyAcceptedVisualExtraction(profile, {
      characterId: "char_test",
      characterNameIfKnown: "Mara Quill",
      visibleAppearance: { hair: "dark auburn hair", clothing: "rain-dark cloak" },
      visualImpressionsNotCanon: [],
      suggestedProfileUpdates: {
        visualDesign: {
          hair: "dark auburn",
          clothingStyle: "rain-dark cloak",
          canonicalSummary: "Archive thief with dark auburn hair and a rain-dark cloak."
        }
      },
      conflictsWithExistingProfile: [],
      unclearDetails: [],
      confidence: "medium"
    });

    expect(updated.visualDesign.hair).toBe("dark auburn");
    expect(updated.sourceTracking.imageInferredDetails).toContain("dark auburn hair");
    expect(updated.canonLevel).toBe("tentative");
  });

  it("builds compact generation context without image history", () => {
    const profile = createCharacterProfile({
      id: "char_test",
      name: "Mara Quill",
      roleInStory: "Reluctant ally",
      visualSeed: "Sharp-eyed archive thief",
      voiceSeed: "Wry and guarded"
    });
    const card = compactCharacterContext(profile);

    expect(card).toMatchObject({
      id: "char_test",
      name: "Mara Quill",
      roleInChapter: "Reluctant ally",
      visualSummary: "Sharp-eyed archive thief",
      voiceNotes: "Wry and guarded"
    });
    expect(JSON.stringify(card)).not.toContain("imageAssets");
  });
});
