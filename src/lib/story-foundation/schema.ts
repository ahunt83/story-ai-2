import { z } from "zod";

const stringArray = z.array(z.string());
const flexibleArray = z.array(z.record(z.string(), z.unknown()).or(z.string()));

export const storyFoundationStatusSchema = z.enum(["draft", "approved"]);

export const storyFoundationSchema = z.object({
  metadata: z.object({
    workingTitle: z.string(),
    createdFromPrompt: z.string(),
    foundationVersion: z.number().int().positive(),
    status: storyFoundationStatusSchema
  }),
  coreConcept: z.object({
    premise: z.string(),
    logline: z.string(),
    coreHook: z.string(),
    storyQuestion: z.string(),
    readerPromise: z.string(),
    targetReaderExperience: z.string()
  }),
  genre: z.object({
    primaryGenre: z.string(),
    secondaryGenres: stringArray,
    subgenres: stringArray,
    genreBlend: z.string(),
    genreConventionsToHonor: stringArray,
    genreConventionsToSubvert: stringArray,
    genreNoGoes: stringArray
  }),
  audienceAndBoundaries: z.object({
    targetAudience: z.string(),
    ageCategory: z.enum(["middle_grade", "young_adult", "adult", "unclear"]),
    contentRating: z.string(),
    violenceLevel: z.string(),
    romanceLevel: z.string(),
    sexualContentLevel: z.string(),
    languageLevel: z.string(),
    darknessLevel: z.string(),
    sensitiveContentConstraints: stringArray,
    hardExclusions: stringArray
  }),
  styleGuide: z.object({
    pov: z.string(),
    povRules: z.string(),
    tense: z.string(),
    narrativeDistance: z.string(),
    narrativeVoice: z.string(),
    proseStyle: z.string(),
    sentenceStyle: z.string(),
    descriptionDensity: z.string(),
    dialogueStyle: z.string(),
    interiorThoughtStyle: z.string(),
    humorStyle: z.string(),
    metaphorStyle: z.string(),
    pacingStyle: z.string(),
    chapterOpeningStyle: z.string(),
    chapterEndingStyle: z.string(),
    styleDo: stringArray,
    styleDoNot: stringArray
  }),
  structure: z.object({
    intendedStoryLength: z.string(),
    estimatedChapterCount: z.string(),
    targetChapterLengthWords: z.string(),
    targetSceneLengthWords: z.string(),
    typicalScenesPerChapter: z.string(),
    structureModel: z.string(),
    actStructure: flexibleArray,
    chapterPattern: z.string(),
    scenePattern: z.string(),
    cliffhangerFrequency: z.string(),
    outlineFlexibility: z.string()
  }),
  themesAndMotifs: z.object({
    mainThemes: stringArray,
    themeQuestions: stringArray,
    emotionalCore: z.string(),
    mood: z.string(),
    atmosphere: z.string(),
    intendedEmotionalJourney: z.string(),
    motifs: stringArray,
    symbols: flexibleArray
  }),
  characters: flexibleArray,
  relationships: flexibleArray,
  settingAndWorldbuilding: z.object({
    settingType: z.string(),
    primarySetting: z.string(),
    timePeriod: z.string(),
    technologyLevel: z.string(),
    magicOrSpeculativeElement: z.string(),
    worldRules: stringArray,
    socialStructure: z.string(),
    politicalStructure: z.string(),
    religionOrBeliefSystems: z.string(),
    economyOrClassSystem: z.string(),
    culturesOrFactions: flexibleArray,
    importantLocations: flexibleArray,
    namingConventions: z.string(),
    worldbuildingDo: stringArray,
    worldbuildingDoNot: stringArray
  }),
  initialPlotPlan: z.object({
    startingSituation: z.string(),
    incitingIncident: z.string(),
    actOneGoal: z.string(),
    midpointShift: z.string(),
    actTwoComplications: stringArray,
    darkestMoment: z.string(),
    climaxDirection: z.string(),
    intendedEndingType: z.string(),
    majorReveals: stringArray,
    majorTwists: stringArray,
    plannedOpenThreads: stringArray,
    subplotSeeds: stringArray
  }),
  mysteriesAndInformationControl: z.object({
    mysteries: flexibleArray,
    secrets: flexibleArray
  }),
  startingTimeline: z.object({
    storyStartDateOrRelativeTime: z.string(),
    timelineStyle: z.string(),
    importantPastEvents: flexibleArray,
    currentWorldState: z.string(),
    timePressure: z.string(),
    deadlineOrCountdown: z.string()
  }),
  chapter1Brief: z.object({
    purpose: z.string(),
    openingImageOrSituation: z.string(),
    povCharacter: z.string(),
    startingLocation: z.string(),
    startingEmotionalState: z.string(),
    sceneGoals: stringArray,
    requiredEvents: stringArray,
    requiredReveals: stringArray,
    thingsToWithhold: stringArray,
    endingState: z.string(),
    endingHook: z.string(),
    continuityRequirements: stringArray
  }),
  generationDefaults: z.object({
    defaultChapterInstruction: z.string(),
    defaultSceneInstruction: z.string(),
    expansionPreference: z.string(),
    dialogueToNarrationBalance: z.string(),
    continuityPriority: z.string(),
    allowedModelCreativity: z.string(),
    mustAvoid: stringArray
  }),
  assumptionsAndGaps: z.object({
    explicitUserRequirements: stringArray,
    inferredChoices: stringArray,
    missingInformation: stringArray,
    recommendedClarifyingQuestions: stringArray
  })
});

export const storyFoundationContextSchema = z.object({
  status: storyFoundationStatusSchema,
  premise: z.string(),
  readerPromise: z.string(),
  storyQuestion: z.string(),
  genreAndTone: z.string(),
  audienceAndBoundaries: z.string(),
  styleGuide: z.string(),
  povAndTense: z.string(),
  criticalWorldRules: stringArray,
  hardConstraints: stringArray,
  chapter1Brief: z.string(),
  generationDefaults: z.string()
});

export type StoryFoundation = z.infer<typeof storyFoundationSchema>;
export type StoryFoundationContext = z.infer<typeof storyFoundationContextSchema>;
export type StoryFoundationStatus = z.infer<typeof storyFoundationStatusSchema>;

export function validateStoryFoundation(input: unknown) {
  return storyFoundationSchema.safeParse(input);
}
