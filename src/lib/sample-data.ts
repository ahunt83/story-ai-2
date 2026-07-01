import type { ChapterContext, ChapterMemory, StoryBible } from "@/lib/story-memory/schema";

export const sampleStories = [
  {
    id: "story_obsidian_echo",
    title: "The Obsidian Echo",
    author: "Creative Professional",
    chapter: "Chapter 4",
    summary: "A mirror in the attic refuses to show the same past twice.",
    status: "Drafting",
    progress: 68,
    words: 18420,
    memoryItems: 142
  },
  {
    id: "story_clockwork_hearts",
    title: "Clockwork Hearts",
    author: "Creative Professional",
    chapter: "Chapter 9",
    summary: "Two rival inventors hide a war inside a love letter.",
    status: "Memory Ready",
    progress: 46,
    words: 32780,
    memoryItems: 221
  },
  {
    id: "story_architecture_silence",
    title: "The Architecture of Silence",
    author: "Creative Professional",
    chapter: "Chapter 2",
    summary: "A city that stores grief in stone begins to answer back.",
    status: "Outline",
    progress: 18,
    words: 7400,
    memoryItems: 63
  }
];

export const sampleChapterText = `The rain against the attic window sounded like the rhythmic drumming of a thousand ghostly stenographers. Elias stood before the vanity, his reflection fractured into a dozen jagged versions of himself.

He reached out a hand, his fingers hovering just inches from the sharpest shard. The glass felt cold, vibrating with a frequency he couldn't name. In the Story Bible, he had written that this mirror was a gift from his grandmother, the only thing he had managed to save from the fire in Ghent. But looking at it now, he was not so sure. Memories were treacherous things, easily rewritten by the stroke of a pen or the whisper of a shadow.

Elena should have been in the garden. That was the rule the story had established three chapters ago. Yet her voice came from the stairwell, soft and certain, asking him why he had opened the room before the house was ready to remember.`;

export const sampleMemory: ChapterMemory = {
  chapterMetadata: {
    chapterNumber: 4,
    title: "The Shattered Mirror",
    povCharacterOrNarrator: "Elias",
    narrativePerson: "third",
    tense: "past",
    mainSetting: "attic vanity room",
    timeframe: "during a rainstorm",
    startState: "Elias confronts the damaged mirror alone.",
    endState: "Elena appears where continuity says she should not be."
  },
  summaries: {
    longSummary: "Elias enters the attic during a rainstorm and studies the shattered vanity mirror that he believes came from his grandmother and survived the fire in Ghent. The mirror behaves as more than an heirloom: its cold vibration suggests a hidden relationship to memory, time, or the house itself. Elias questions whether his own written continuity can be trusted, realizing that memory can be revised as easily as prose. The chapter ends with Elena's voice coming from the stairwell even though prior continuity placed her in the garden, creating an explicit contradiction that must be resolved rather than ignored.",
    mediumSummary: "Elias studies the shattered attic mirror during a rainstorm. The mirror, believed to be his grandmother's surviving gift from Ghent, vibrates with an unexplained force and makes him doubt the reliability of memory. Elena appears in the stairwell despite established continuity placing her in the garden.",
    shortSummary: "Elias confronts the vibrating attic mirror and Elena appears in a place that contradicts prior continuity."
  },
  mainEventsInOrder: [
    {
      event: "Elias studies the shattered mirror in the attic.",
      cause: "The rainstorm and his uncertainty draw him back to the vanity.",
      effect: "The mirror becomes an active continuity object.",
      charactersInvolved: ["Elias"],
      importance: "major",
      persistence: "permanent",
      evidenceOrBasis: "his reflection fractured into a dozen jagged versions"
    }
  ],
  canonFactsEstablished: [
    {
      fact: "The mirror is linked to Elias's grandmother and the fire in Ghent, though that origin may be unreliable.",
      category: "object",
      importance: "critical",
      persistence: "permanent",
      evidenceOrBasis: "gift from his grandmother... saved from the fire in Ghent"
    }
  ],
  characterStates: [
    {
      name: "Elias",
      aliases: [],
      roleInStory: "protagonist",
      statusAtChapterEnd: "alone in the attic until Elena's unexpected arrival",
      locationAtChapterEnd: "attic vanity room",
      physicalState: "unharmed",
      emotionalState: "doubtful and unsettled",
      goalsAndMotivations: ["understand the mirror", "verify whether memory can be trusted"],
      decisionsMade: ["opened the attic room before the house was ready"],
      newInformationLearned: ["the mirror vibrates with an unknown frequency"],
      secretsKnownOrKept: [],
      promisesOathsDebtsOrObligations: [],
      skillsPowersLimitationsOrResourcesShown: [],
      possessions: ["shattered mirror"],
      relationshipUpdates: ["Elena challenges his timing and judgment"],
      continuityNotes: ["Elias may have written unreliable facts into the Story Bible."],
      importance: "critical",
      persistence: "until_resolved",
      evidenceOrBasis: "Memories were treacherous things"
    }
  ],
  relationshipUpdates: [],
  locations: [
    {
      name: "attic vanity room",
      significance: "Location of the mirror and the apparent continuity rupture.",
      currentState: "opened before the house was ready to remember",
      associatedCharacters: ["Elias", "Elena"],
      importance: "major",
      persistence: "permanent",
      evidenceOrBasis: "why he had opened the room"
    }
  ],
  importantObjects: [
    {
      name: "shattered mirror",
      description: "A fractured vanity mirror with a cold vibration.",
      ownerOrHolder: "Elias",
      significance: "May rewrite or reveal unreliable memory.",
      currentLocation: "attic vanity room",
      importance: "critical",
      persistence: "permanent",
      evidenceOrBasis: "The glass felt cold, vibrating"
    }
  ],
  worldbuilding: [],
  timeline: {
    chronologyNotes: ["Elena should be in the garden according to prior continuity."],
    chapterTimeframe: "single rainstorm scene",
    elapsedTime: "minutes",
    sequenceWarnings: ["Elena's presence in the stairwell may contradict Chapter 3."]
  },
  knowledgeState: [],
  openThreads: [
    {
      thread: "Why can Elena appear in the stairwell if the story established she was in the garden?",
      status: "open",
      charactersInvolved: ["Elias", "Elena"],
      futureRelevance: "Needs resolution in the next scene or a continuity explanation.",
      importance: "critical",
      persistence: "until_resolved",
      evidenceOrBasis: "Elena should have been in the garden"
    }
  ],
  resolvedThreads: [],
  foreshadowingAndSetups: [],
  conflicts: [],
  styleAndVoice: {
    pov: "close third on Elias",
    narrativePerson: "third",
    tense: "past",
    tone: "literary, atmospheric, uncanny",
    genreSignals: ["gothic mystery", "metafictional memory"],
    pacing: "slow and tense",
    descriptionLevel: "sensory and symbolic",
    dialogueStyle: "sparse",
    motifs: ["rain", "glass", "rewritten memory"],
    constraintsForFutureChapters: ["Keep the mirror uncanny but not fully explained yet."]
  },
  continuityWarnings: [
    {
      warning: "Elena's location conflicts with prior chapter logic.",
      possibleContradiction: "She was last established in the garden.",
      suggestedHandling: "Resolve as deliberate memory distortion, timeline rupture, or mistaken assumption.",
      importance: "critical",
      persistence: "until_resolved",
      evidenceOrBasis: "Elena should have been in the garden"
    }
  ],
  doNotForget: [],
  uncertaintiesOrAmbiguities: [],
  newCharacterCandidates: []
};

export const sampleBible: StoryBible = {
  characters: sampleMemory.characterStates,
  relationships: [],
  majorTimeline: sampleMemory.timeline.chronologyNotes,
  worldbuilding: sampleMemory.worldbuilding,
  importantLocations: sampleMemory.locations,
  importantObjects: sampleMemory.importantObjects,
  openThreads: sampleMemory.openThreads,
  resolvedThreads: [],
  narrativeStyleConstraints: sampleMemory.styleAndVoice,
  continuityWarnings: sampleMemory.continuityWarnings,
  updatedFromChapterNumber: 4
};

export const sampleContext: ChapterContext = {
  storyBible: sampleBible,
  previousLongSummary: sampleMemory.summaries.longSummary,
  recentMediumSummaries: [{ chapterNumber: 3, summary: "Elena was last seen in the garden while Elias searched the upper house alone." }],
  olderShortSummaries: [{ chapterNumber: 1, summary: "The mirror survived the fire in Ghent and became Elias's private proof of family history." }],
  criticalFacts: sampleMemory.canonFactsEstablished,
  relevantMemoryItems: [
    {
      id: "memory_mirror",
      category: "object",
      label: "Mirror Origin",
      content: "The mirror is tied to Ghent and may destabilize memory.",
      importance: "critical",
      evidenceOrBasis: "saved from the fire in Ghent",
      sourceChapterNumber: 4,
      similarity: 0.91
    },
    {
      id: "memory_elena",
      category: "continuity_warning",
      label: "Elena's Location",
      content: "Elena appearing in the attic stairwell contradicts her garden placement.",
      importance: "critical",
      evidenceOrBasis: "Elena should have been in the garden",
      sourceChapterNumber: 4,
      similarity: 0.87
    }
  ],
  charactersForThisChapter: [],
  openThreads: sampleMemory.openThreads,
  styleAndVoice: sampleMemory.styleAndVoice
};
