import type { ChapterContext, ChapterMemory, StoryBible } from "./schema";

export const emptyBible: StoryBible = {
  characters: [],
  relationships: [],
  majorTimeline: [],
  worldbuilding: [],
  importantLocations: [],
  importantObjects: [],
  openThreads: [],
  resolvedThreads: [],
  continuityWarnings: [],
  updatedFromChapterNumber: 0
};

export function createMockChapterMemory(chapterText: string, chapterNumber = 1, title = "Untitled Chapter"): ChapterMemory {
  const excerpt = chapterText.split(/\s+/).slice(0, 28).join(" ");

  return {
    chapterMetadata: {
      chapterNumber,
      title,
      povCharacterOrNarrator: "unclear",
      narrativePerson: "third",
      tense: "past",
      mainSetting: "Primary scene location",
      timeframe: "during the chapter",
      startState: "The chapter opens with unresolved narrative tension.",
      endState: "The chapter closes with a changed emotional or factual state."
    },
    summaries: {
      longSummary: `This chapter establishes the immediate dramatic situation and advances the story through a sequence of consequential choices. ${excerpt}... The memory extractor should be replaced by a live OpenRouter response when an API key is configured, but this deterministic fallback keeps the approval workflow available during local development.`,
      mediumSummary: `The chapter moves the story forward, introduces or updates key continuity facts, and leaves future consequences for the next writing session.`,
      shortSummary: `A chapter-level continuity breadcrumb is created for future context.`
    },
    mainEventsInOrder: [
      {
        event: "The chapter introduces a consequential scene that should inform future writing.",
        cause: "The user approved the chapter for continuity extraction.",
        effect: "Future prompts can reference this chapter without sending the full prose.",
        charactersInvolved: [],
        importance: "major",
        persistence: "permanent",
        evidenceOrBasis: excerpt
      }
    ],
    canonFactsEstablished: [
      {
        fact: "The approved chapter text is now canonical for this story.",
        category: "continuity",
        importance: "critical",
        persistence: "permanent",
        evidenceOrBasis: excerpt
      }
    ],
    characterStates: [],
    relationshipUpdates: [],
    locations: [],
    importantObjects: [],
    worldbuilding: [],
    timeline: {
      chronologyNotes: [`Chapter ${chapterNumber} follows the previous approved chapter.`],
      chapterTimeframe: "unclear",
      elapsedTime: "unclear",
      sequenceWarnings: []
    },
    knowledgeState: [],
    openThreads: [
      {
        thread: "The next chapter should honor the approved chapter's emotional and factual consequences.",
        status: "open",
        charactersInvolved: [],
        futureRelevance: "Used by the writing context builder.",
        importance: "major",
        persistence: "until_resolved",
        evidenceOrBasis: excerpt
      }
    ],
    resolvedThreads: [],
    foreshadowingAndSetups: [],
    conflicts: [],
    styleAndVoice: {
      narrativePerson: "third",
      tense: "past",
      tone: "literary and focused",
      genreSignals: [],
      motifs: [],
      constraintsForFutureChapters: ["Keep prose consistent with the approved chapter."]
    },
    continuityWarnings: [],
    doNotForget: [
      {
        item: "Use extracted structured memory rather than relying only on prose summaries.",
        reason: "Structured memory protects character state, promises, knowledge, and unresolved consequences.",
        importance: "critical",
        persistence: "permanent"
      }
    ],
    uncertaintiesOrAmbiguities: []
  };
}

export function mergeBibleLocally(existing: StoryBible | null, memory: ChapterMemory): StoryBible {
  return {
    characters: [...(existing?.characters ?? []), ...memory.characterStates],
    relationships: [...(existing?.relationships ?? []), ...memory.relationshipUpdates],
    majorTimeline: [...(existing?.majorTimeline ?? []), ...memory.timeline.chronologyNotes],
    worldbuilding: [...(existing?.worldbuilding ?? []), ...memory.worldbuilding],
    importantLocations: [...(existing?.importantLocations ?? []), ...memory.locations],
    importantObjects: [...(existing?.importantObjects ?? []), ...memory.importantObjects],
    openThreads: [...(existing?.openThreads ?? []), ...memory.openThreads],
    resolvedThreads: [...(existing?.resolvedThreads ?? []), ...memory.resolvedThreads],
    narrativeStyleConstraints: memory.styleAndVoice,
    continuityWarnings: [...(existing?.continuityWarnings ?? []), ...memory.continuityWarnings],
    updatedFromChapterNumber: memory.chapterMetadata.chapterNumber
  };
}

export function createMockContext(): ChapterContext {
  return {
    storyBible: emptyBible,
    previousLongSummary: "The previous chapter established a charged emotional state and a concrete continuity trail.",
    recentMediumSummaries: [],
    olderShortSummaries: [],
    criticalFacts: [],
    relevantMemoryItems: [
      {
        id: "mock_memory_1",
        category: "canon_fact",
        label: "Approved prose is canon",
        content: "Future drafting should follow the approved chapter state.",
        importance: "critical",
        evidenceOrBasis: "local fallback"
      }
    ],
    openThreads: [],
    styleAndVoice: {
      narrativePerson: "third",
      tense: "past",
      tone: "literary",
      genreSignals: [],
      motifs: [],
      constraintsForFutureChapters: []
    }
  };
}
