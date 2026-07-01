import type { StoryFoundation, StoryFoundationContext, StoryFoundationStatus } from "./schema";

export function buildStoryFoundationContext(
  foundation: StoryFoundation,
  status: StoryFoundationStatus
): StoryFoundationContext {
  return {
    status,
    premise: foundation.coreConcept.premise,
    readerPromise: foundation.coreConcept.readerPromise,
    storyQuestion: foundation.coreConcept.storyQuestion,
    genreAndTone: [
      foundation.genre.primaryGenre,
      foundation.genre.secondaryGenres.join(", "),
      foundation.genre.genreBlend,
      foundation.themesAndMotifs.mood
    ].filter(Boolean).join(" / "),
    audienceAndBoundaries: [
      foundation.audienceAndBoundaries.targetAudience,
      foundation.audienceAndBoundaries.contentRating,
      foundation.audienceAndBoundaries.violenceLevel,
      foundation.audienceAndBoundaries.romanceLevel,
      foundation.audienceAndBoundaries.darknessLevel
    ].filter(Boolean).join(" "),
    styleGuide: [
      foundation.styleGuide.narrativeVoice,
      foundation.styleGuide.proseStyle,
      foundation.styleGuide.dialogueStyle,
      foundation.styleGuide.pacingStyle,
      ...foundation.styleGuide.styleDo,
      ...foundation.styleGuide.styleDoNot.map((item) => `Avoid: ${item}`)
    ].filter(Boolean).join(" "),
    povAndTense: [foundation.styleGuide.pov, foundation.styleGuide.tense, foundation.styleGuide.povRules].filter(Boolean).join(" / "),
    criticalWorldRules: foundation.settingAndWorldbuilding.worldRules,
    hardConstraints: [
      ...foundation.audienceAndBoundaries.hardExclusions,
      ...foundation.genre.genreNoGoes,
      ...foundation.generationDefaults.mustAvoid
    ],
    chapter1Brief: [
      foundation.chapter1Brief.purpose,
      foundation.chapter1Brief.openingImageOrSituation,
      foundation.chapter1Brief.endingHook
    ].filter(Boolean).join(" "),
    generationDefaults: [
      foundation.generationDefaults.defaultChapterInstruction,
      foundation.generationDefaults.defaultSceneInstruction,
      foundation.generationDefaults.expansionPreference,
      foundation.generationDefaults.continuityPriority,
      foundation.generationDefaults.allowedModelCreativity
    ].filter(Boolean).join(" ")
  };
}
