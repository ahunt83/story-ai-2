import { z } from "zod";

import { characterContextCardSchema, newCharacterCandidateSchema } from "@/lib/characters/schema";
import { storyFoundationContextSchema } from "@/lib/story-foundation/schema";

export const importanceSchema = z.enum(["critical", "major", "minor"]);
export const persistenceSchema = z.enum(["permanent", "until_resolved", "temporary", "unclear"]);
export const narrativePersonSchema = z.enum(["first", "second", "third", "mixed", "unclear"]);
export const tenseSchema = z.enum(["past", "present", "mixed", "unclear"]);

export type Importance = z.infer<typeof importanceSchema>;
export type Persistence = z.infer<typeof persistenceSchema>;
export type NarrativePerson = z.infer<typeof narrativePersonSchema>;
export type Tense = z.infer<typeof tenseSchema>;

const importanceFieldsSchema = z.object({
  importance: importanceSchema,
  persistence: persistenceSchema.optional(),
  evidenceOrBasis: z.string().optional()
});

const stringArray = z.array(z.string()).default([]);

export const chapterMetadataSchema = z.object({
  chapterNumber: z.number().int().positive(),
  title: z.string().optional(),
  povCharacterOrNarrator: z.string().optional(),
  narrativePerson: narrativePersonSchema,
  tense: tenseSchema,
  mainSetting: z.string().optional(),
  timeframe: z.string().optional(),
  startState: z.string().optional(),
  endState: z.string().optional()
});

export const chapterSummariesSchema = z.object({
  longSummary: z.string().min(1),
  mediumSummary: z.string().min(1),
  shortSummary: z.string().min(1)
});

export const storyEventSchema = importanceFieldsSchema.extend({
  event: z.string(),
  cause: z.string().optional(),
  effect: z.string().optional(),
  charactersInvolved: stringArray
});

export const canonFactSchema = importanceFieldsSchema.extend({
  fact: z.string(),
  category: z.string()
});

export const relationshipUpdateSchema = importanceFieldsSchema.extend({
  characters: stringArray,
  relationship: z.string(),
  change: z.string(),
  currentStatus: z.string().optional()
});

export const characterStateSchema = importanceFieldsSchema.extend({
  name: z.string(),
  aliases: stringArray,
  roleInStory: z.string().optional(),
  statusAtChapterEnd: z.string().optional(),
  locationAtChapterEnd: z.string().optional(),
  physicalState: z.string().optional(),
  emotionalState: z.string().optional(),
  goalsAndMotivations: stringArray,
  decisionsMade: stringArray,
  newInformationLearned: stringArray,
  secretsKnownOrKept: stringArray,
  promisesOathsDebtsOrObligations: stringArray,
  skillsPowersLimitationsOrResourcesShown: stringArray,
  possessions: stringArray,
  relationshipUpdates: stringArray,
  continuityNotes: stringArray
});

export const locationMemorySchema = importanceFieldsSchema.extend({
  name: z.string(),
  significance: z.string(),
  currentState: z.string().optional(),
  associatedCharacters: stringArray
});

export const objectMemorySchema = importanceFieldsSchema.extend({
  name: z.string(),
  description: z.string().optional(),
  ownerOrHolder: z.string().optional(),
  significance: z.string(),
  currentLocation: z.string().optional()
});

export const worldbuildingMemorySchema = importanceFieldsSchema.extend({
  category: z.string(),
  detail: z.string(),
  implications: z.string().optional()
});

export const timelineMemorySchema = z.object({
  chronologyNotes: stringArray,
  chapterTimeframe: z.string().optional(),
  elapsedTime: z.string().optional(),
  sequenceWarnings: stringArray
});

export const characterKnowledgeStateSchema = importanceFieldsSchema.extend({
  character: z.string(),
  knows: stringArray,
  believes: stringArray,
  isWrongAbout: stringArray,
  doesNotYetKnow: stringArray,
  secretsTheyAreHiding: stringArray,
  secretsHiddenFromThem: stringArray
});

export const storyThreadSchema = importanceFieldsSchema.extend({
  thread: z.string(),
  status: z.string(),
  charactersInvolved: stringArray,
  futureRelevance: z.string().optional()
});

export const resolvedThreadSchema = importanceFieldsSchema.extend({
  thread: z.string(),
  resolution: z.string(),
  consequences: z.string().optional()
});

export const foreshadowingSetupSchema = importanceFieldsSchema.extend({
  setup: z.string(),
  possiblePayoff: z.string().optional(),
  charactersInvolved: stringArray
});

export const conflictMemorySchema = importanceFieldsSchema.extend({
  conflict: z.string(),
  parties: stringArray,
  currentState: z.string(),
  stakes: z.string().optional()
});

export const styleAndVoiceMemorySchema = z.object({
  pov: z.string().optional(),
  narrativePerson: narrativePersonSchema,
  tense: tenseSchema,
  tone: z.string().optional(),
  genreSignals: stringArray,
  pacing: z.string().optional(),
  descriptionLevel: z.string().optional(),
  dialogueStyle: z.string().optional(),
  humorStyle: z.string().optional(),
  violenceOrRomanceLevel: z.string().optional(),
  motifs: stringArray,
  diction: z.string().optional(),
  constraintsForFutureChapters: stringArray
});

export const continuityWarningSchema = importanceFieldsSchema.extend({
  warning: z.string(),
  possibleContradiction: z.string().optional(),
  suggestedHandling: z.string().optional()
});

export const doNotForgetItemSchema = importanceFieldsSchema.extend({
  item: z.string(),
  reason: z.string().optional()
});

export const ambiguityItemSchema = importanceFieldsSchema.extend({
  ambiguity: z.string(),
  possibleInterpretations: stringArray
});

export const chapterMemorySchema = z.object({
  chapterMetadata: chapterMetadataSchema,
  summaries: chapterSummariesSchema,
  mainEventsInOrder: z.array(storyEventSchema),
  canonFactsEstablished: z.array(canonFactSchema),
  characterStates: z.array(characterStateSchema),
  relationshipUpdates: z.array(relationshipUpdateSchema),
  locations: z.array(locationMemorySchema),
  importantObjects: z.array(objectMemorySchema),
  worldbuilding: z.array(worldbuildingMemorySchema),
  timeline: timelineMemorySchema,
  knowledgeState: z.array(characterKnowledgeStateSchema),
  openThreads: z.array(storyThreadSchema),
  resolvedThreads: z.array(resolvedThreadSchema),
  foreshadowingAndSetups: z.array(foreshadowingSetupSchema),
  conflicts: z.array(conflictMemorySchema),
  styleAndVoice: styleAndVoiceMemorySchema,
  continuityWarnings: z.array(continuityWarningSchema),
  doNotForget: z.array(doNotForgetItemSchema),
  uncertaintiesOrAmbiguities: z.array(ambiguityItemSchema),
  newCharacterCandidates: z.array(newCharacterCandidateSchema).default([])
});

export const storyBibleSchema = z.object({
  characters: z.array(characterStateSchema),
  relationships: z.array(relationshipUpdateSchema),
  majorTimeline: stringArray,
  worldbuilding: z.array(worldbuildingMemorySchema),
  importantLocations: z.array(locationMemorySchema),
  importantObjects: z.array(objectMemorySchema),
  openThreads: z.array(storyThreadSchema),
  resolvedThreads: z.array(resolvedThreadSchema),
  narrativeStyleConstraints: styleAndVoiceMemorySchema.optional(),
  continuityWarnings: z.array(continuityWarningSchema),
  updatedFromChapterNumber: z.number().int().nonnegative()
});

export const chapterContextSchema = z.object({
  storyBible: storyBibleSchema.nullable(),
  storyFoundationContext: storyFoundationContextSchema.nullable().optional(),
  previousLongSummary: z.string().optional(),
  recentMediumSummaries: z.array(z.object({ chapterNumber: z.number(), summary: z.string() })),
  olderShortSummaries: z.array(z.object({ chapterNumber: z.number(), summary: z.string() })),
  criticalFacts: z.array(canonFactSchema),
  relevantMemoryItems: z.array(z.object({
    id: z.string(),
    category: z.string(),
    label: z.string(),
    content: z.string(),
    importance: importanceSchema,
    evidenceOrBasis: z.string().optional(),
    sourceChapterNumber: z.number().optional(),
    similarity: z.number().optional()
  })),
  charactersForThisChapter: z.array(characterContextCardSchema).default([]),
  openThreads: z.array(storyThreadSchema),
  styleAndVoice: styleAndVoiceMemorySchema.optional()
});

export type ChapterMemory = z.infer<typeof chapterMemorySchema>;
export type StoryBible = z.infer<typeof storyBibleSchema>;
export type ChapterContext = z.infer<typeof chapterContextSchema>;

export function validateChapterMemory(input: unknown) {
  return chapterMemorySchema.safeParse(input);
}
