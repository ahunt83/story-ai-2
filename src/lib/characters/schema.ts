import { z } from "zod";

const stringArray = z.array(z.string()).default([]);
const recordArray = z.array(z.record(z.string(), z.unknown())).default([]);

export const characterStatusSchema = z.enum(["draft", "active", "inactive", "dead", "missing", "archived"]);
export const characterImportanceSchema = z.enum(["protagonist", "major", "supporting", "minor", "background"]);
export const characterCreatedFromSchema = z.enum(["story_foundation", "manual", "image", "scene", "chapter_extraction", "imported"]);
export const characterCanonLevelSchema = z.enum(["confirmed", "tentative", "mixed"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]).default("medium");

export const visualDesignSchema = z.object({
  canonicalSummary: z.string().default(""),
  apparentAge: z.string().default(""),
  heightBuild: z.string().default(""),
  face: z.string().default(""),
  hair: z.string().default(""),
  eyes: z.string().default(""),
  skinOrComplexion: z.string().default(""),
  distinguishingFeatures: stringArray,
  clothingStyle: z.string().default(""),
  signatureItems: stringArray,
  postureBodyLanguage: z.string().default(""),
  colorPalette: stringArray,
  overallAesthetic: z.string().default(""),
  visualMotifs: stringArray,
  doNotChange: stringArray,
  flexibleVisualDetails: stringArray,
  descriptionForProse: z.string().default(""),
  descriptionForImageGeneration: z.string().default("")
});

export const characterProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  displayName: z.string().default(""),
  aliasesOrTitles: stringArray,
  status: characterStatusSchema.default("draft"),
  importance: characterImportanceSchema.default("supporting"),
  createdFrom: characterCreatedFromSchema.default("manual"),
  canonLevel: characterCanonLevelSchema.default("tentative"),
  identity: z.object({
    pronouns: z.string().default(""),
    ageOrLifeStage: z.string().default(""),
    speciesOrType: z.string().default(""),
    occupationOrRole: z.string().default(""),
    socialPosition: z.string().default(""),
    affiliations: stringArray,
    homelandOrOrigin: z.string().default(""),
    notes: stringArray
  }).prefault({}),
  storyFunction: z.object({
    roleInStory: z.string().default(""),
    narrativePurpose: z.string().default(""),
    relationshipToProtagonist: z.string().default(""),
    archetypeOrFunction: z.string().default(""),
    importanceToMainPlot: z.string().default(""),
    importanceToSubplots: stringArray,
    plannedArc: z.string().default(""),
    arcStatus: z.string().default("not_started")
  }).prefault({}),
  visualDesign: visualDesignSchema.prefault({}),
  personality: z.object({
    summary: z.string().default(""),
    traits: stringArray,
    virtues: stringArray,
    flaws: stringArray,
    fears: stringArray,
    desires: stringArray,
    misbeliefs: stringArray,
    contradictions: stringArray,
    emotionalTriggers: stringArray,
    copingMechanisms: stringArray,
    moralBoundaries: stringArray
  }).prefault({}),
  voice: z.object({
    dialogueStyle: z.string().default(""),
    vocabulary: z.string().default(""),
    speechRhythm: z.string().default(""),
    formalityLevel: z.string().default(""),
    humorStyle: z.string().default(""),
    commonPhrases: stringArray,
    thingsTheyAvoidSaying: stringArray,
    innerMonologueStyle: z.string().default(""),
    voiceDo: stringArray,
    voiceDoNot: stringArray
  }).prefault({}),
  backstory: z.object({
    publicBackstory: z.string().default(""),
    privateBackstory: z.string().default(""),
    formativeEvents: stringArray,
    woundsOrRegrets: stringArray,
    secrets: stringArray,
    rumors: stringArray,
    unresolvedPastThreads: stringArray
  }).prefault({}),
  goalsAndMotivations: z.object({
    externalGoal: z.string().default(""),
    internalNeed: z.string().default(""),
    shortTermGoals: stringArray,
    longTermGoals: stringArray,
    hiddenAgenda: z.string().default(""),
    stakesForCharacter: z.string().default(""),
    whatTheyWantFromOthers: stringArray
  }).prefault({}),
  abilitiesAndLimits: z.object({
    skills: stringArray,
    powersOrSpecialAbilities: stringArray,
    limitations: stringArray,
    knowledgeAreas: stringArray,
    resources: stringArray,
    weaknesses: stringArray
  }).prefault({}),
  relationships: recordArray,
  knowledgeState: z.object({
    knows: stringArray,
    believes: stringArray,
    isWrongAbout: stringArray,
    doesNotKnowYet: stringArray,
    secretsTheyAreHiding: stringArray,
    secretsHiddenFromThem: stringArray
  }).prefault({}),
  currentStoryState: z.object({
    currentLocation: z.string().default(""),
    physicalState: z.string().default(""),
    emotionalState: z.string().default(""),
    currentGoal: z.string().default(""),
    currentConflict: z.string().default(""),
    possessions: stringArray,
    obligations: stringArray,
    lastSeenChapter: z.string().default(""),
    lastSeenScene: z.string().default(""),
    lastKnownAction: z.string().default(""),
    nextExpectedAction: z.string().default("")
  }).prefault({}),
  continuity: z.object({
    mustRemember: stringArray,
    mustNotContradict: stringArray,
    mustNotRevealYet: stringArray,
    openThreads: stringArray,
    resolvedThreads: stringArray,
    foreshadowingConnectedToCharacter: stringArray,
    canonWarnings: stringArray
  }).prefault({}),
  sourceTracking: z.object({
    explicitUserRequirements: stringArray,
    imageInferredDetails: stringArray,
    sceneEstablishedFacts: stringArray,
    chapterEstablishedFacts: stringArray,
    aiSuggestions: stringArray,
    userConfirmedFacts: stringArray,
    conflictsOrUncertainties: stringArray
  }).prefault({})
});

export const imageGenerationBriefSchema = z.object({
  characterId: z.string().optional(),
  characterName: z.string().default(""),
  visualGoal: z.string().default("Character portrait"),
  coreAppearance: z.string().default(""),
  faceAndExpression: z.string().default(""),
  hair: z.string().default(""),
  bodyAndPosture: z.string().default(""),
  clothing: z.string().default(""),
  accessories: stringArray,
  distinctiveFeatures: stringArray,
  settingOrBackground: z.string().default(""),
  mood: z.string().default(""),
  artDirection: z.string().default(""),
  mustInclude: stringArray,
  mustPreserve: stringArray,
  mustAvoid: stringArray,
  imagePrompt: z.string().min(1),
  negativePrompt: z.string().default(""),
  variationNotes: z.string().default("")
});

export const imageCharacterExtractionSchema = z.object({
  characterId: z.string().optional(),
  characterNameIfKnown: z.string().default(""),
  visibleAppearance: z.record(z.string(), z.unknown()).prefault({}),
  visualImpressionsNotCanon: recordArray,
  suggestedProfileUpdates: z.object({
    visualDesign: visualDesignSchema.partial().prefault({})
  }).prefault({}),
  conflictsWithExistingProfile: recordArray,
  unclearDetails: stringArray,
  confidence: confidenceSchema
});

export const newCharacterCandidateSchema = z.object({
  candidateId: z.string().optional(),
  possibleName: z.string().min(1),
  aliasesOrTitles: stringArray,
  reasonForExtraction: z.string().default(""),
  confidence: confidenceSchema,
  possibleDuplicateOfExistingCharacterId: z.string().default(""),
  sceneEvidence: z.record(z.string(), z.unknown()).prefault({}),
  suggestedCharacterProfile: z.record(z.string(), z.unknown()).prefault({}),
  requiresUserReview: z.boolean().default(true)
});

export const characterContextCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  importance: z.string(),
  roleInChapter: z.string().default(""),
  visualSummary: z.string().default(""),
  personalitySummary: z.string().default(""),
  voiceNotes: z.string().default(""),
  currentLocation: z.string().default(""),
  currentPhysicalState: z.string().default(""),
  currentEmotionalState: z.string().default(""),
  currentGoal: z.string().default(""),
  currentKnowledge: stringArray,
  secretsOrHiddenAgenda: stringArray,
  relationshipNotes: stringArray,
  mustRemember: stringArray,
  mustNotContradict: stringArray,
  mustNotRevealYet: stringArray
});

export type CharacterProfile = z.infer<typeof characterProfileSchema>;
export type ImageGenerationBrief = z.infer<typeof imageGenerationBriefSchema>;
export type ImageCharacterExtraction = z.infer<typeof imageCharacterExtractionSchema>;
export type NewCharacterCandidate = z.infer<typeof newCharacterCandidateSchema>;
export type CharacterContextCard = z.infer<typeof characterContextCardSchema>;
