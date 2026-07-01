import type { StoryFoundation } from "./schema";

export function createMockStoryFoundation(params: {
  title: string;
  initialPrompt: string;
  genreToneNotes?: string | null;
}): StoryFoundation {
  const genreTone = params.genreToneNotes?.trim() || "genre and tone to be refined";
  const prompt = params.initialPrompt.trim();

  return {
    metadata: {
      workingTitle: params.title,
      createdFromPrompt: prompt,
      foundationVersion: 1,
      status: "draft"
    },
    coreConcept: {
      premise: prompt,
      logline: `A story about ${prompt}`,
      coreHook: "The initial user premise is the central hook; refine this during foundation review.",
      storyQuestion: "What choice or discovery will force the protagonist to change?",
      readerPromise: `A ${genreTone} story that develops the user's premise with continuity and clear emotional stakes.`,
      targetReaderExperience: "Immersive, coherent, emotionally engaged, and consistent from chapter to chapter."
    },
    genre: {
      primaryGenre: genreTone,
      secondaryGenres: [],
      subgenres: [],
      genreBlend: genreTone,
      genreConventionsToHonor: ["Maintain the expectations implied by the user's genre and tone notes."],
      genreConventionsToSubvert: [],
      genreNoGoes: []
    },
    audienceAndBoundaries: {
      targetAudience: "Readers aligned with the stated genre and tone.",
      ageCategory: "unclear",
      contentRating: "Unspecified; keep content moderate until the user sets boundaries.",
      violenceLevel: "Unspecified",
      romanceLevel: "Unspecified",
      sexualContentLevel: "Unspecified",
      languageLevel: "Unspecified",
      darknessLevel: "Unspecified",
      sensitiveContentConstraints: [],
      hardExclusions: []
    },
    styleGuide: {
      pov: "unclear",
      povRules: "Choose a consistent POV and do not reveal information unavailable to the current narrator or POV character.",
      tense: "unclear",
      narrativeDistance: "moderate",
      narrativeVoice: genreTone,
      proseStyle: "Clear, polished prose that supports the story's tone.",
      sentenceStyle: "Vary sentence length for clarity, rhythm, and emphasis.",
      descriptionDensity: "Moderate",
      dialogueStyle: "Character-specific and purposeful.",
      interiorThoughtStyle: "Use interiority to deepen motivation and tension.",
      humorStyle: "Use only if it fits the stated tone.",
      metaphorStyle: "Draw imagery from the story's setting, conflicts, and motifs.",
      pacingStyle: "Escalate through concrete turns, discoveries, and consequences.",
      chapterOpeningStyle: "Open with an image, action, disturbance, or question.",
      chapterEndingStyle: "End with a reveal, decision, reversal, or emotionally charged uncertainty.",
      styleDo: ["Keep prose aligned with the reader promise.", "Preserve continuity from the foundation and later chapter memory."],
      styleDoNot: ["Do not over-explain the plan inside the prose.", "Do not contradict established chapter canon."]
    },
    structure: {
      intendedStoryLength: "To be decided",
      estimatedChapterCount: "To be decided",
      targetChapterLengthWords: "To be decided",
      targetSceneLengthWords: "To be decided",
      typicalScenesPerChapter: "To be decided",
      structureModel: "Flexible narrative escalation",
      actStructure: [],
      chapterPattern: "Each chapter should create a meaningful change in plot, character, or knowledge.",
      scenePattern: "Each scene should have a goal, obstacle, turn, and changed ending state.",
      cliffhangerFrequency: "Use when earned.",
      outlineFlexibility: "Flexible; later canon overrides this initial plan."
    },
    themesAndMotifs: {
      mainThemes: [],
      themeQuestions: [],
      emotionalCore: "To be refined during foundation review.",
      mood: genreTone,
      atmosphere: "To be refined during foundation review.",
      intendedEmotionalJourney: "From the opening unresolved state toward a meaningful transformation.",
      motifs: [],
      symbols: []
    },
    characters: [],
    relationships: [],
    settingAndWorldbuilding: {
      settingType: "To be decided",
      primarySetting: "To be decided",
      timePeriod: "To be decided",
      technologyLevel: "To be decided",
      magicOrSpeculativeElement: "To be decided",
      worldRules: [],
      socialStructure: "To be decided",
      politicalStructure: "To be decided",
      religionOrBeliefSystems: "To be decided",
      economyOrClassSystem: "To be decided",
      culturesOrFactions: [],
      importantLocations: [],
      namingConventions: "Use names that fit the genre, setting, and tone.",
      worldbuildingDo: ["Reveal worldbuilding through action, conflict, and consequence."],
      worldbuildingDoNot: ["Do not front-load unnecessary exposition."]
    },
    initialPlotPlan: {
      startingSituation: "To be derived from the opening prompt.",
      incitingIncident: "To be decided",
      actOneGoal: "To be decided",
      midpointShift: "To be decided",
      actTwoComplications: [],
      darkestMoment: "To be decided",
      climaxDirection: "To be decided",
      intendedEndingType: "To be decided",
      majorReveals: [],
      majorTwists: [],
      plannedOpenThreads: [],
      subplotSeeds: []
    },
    mysteriesAndInformationControl: {
      mysteries: [],
      secrets: []
    },
    startingTimeline: {
      storyStartDateOrRelativeTime: "At the story opening.",
      timelineStyle: "Mostly linear unless the user specifies otherwise.",
      importantPastEvents: [],
      currentWorldState: "To be refined during foundation review.",
      timePressure: "To be decided",
      deadlineOrCountdown: "To be decided"
    },
    chapter1Brief: {
      purpose: "Introduce the story's central promise, protagonist or viewpoint, initial tension, and first meaningful disturbance.",
      openingImageOrSituation: "Begin with a concrete situation implied by the user's prompt.",
      povCharacter: "To be decided",
      startingLocation: "To be decided",
      startingEmotionalState: "Unsettled or primed for change.",
      sceneGoals: ["Establish the opening situation.", "Create a reason for the reader to continue."],
      requiredEvents: [],
      requiredReveals: [],
      thingsToWithhold: ["Avoid resolving the central story question too early."],
      endingState: "The story has moved into a more charged state.",
      endingHook: "End with a question, consequence, or decision that points forward.",
      continuityRequirements: ["Chapter 1 should honor this foundation while leaving room for later canon to evolve."]
    },
    generationDefaults: {
      defaultChapterInstruction: "Draft the next chapter using the Story Foundation, Story Bible, and current user direction.",
      defaultSceneInstruction: "Draft the selected scene with a clear scene turn and continuity-aware details.",
      expansionPreference: "Prefer specific dramatized scenes over summary.",
      dialogueToNarrationBalance: "Balance dialogue, action, interiority, and description according to the style guide.",
      continuityPriority: "Latest user instruction and written canon outrank this initial plan.",
      allowedModelCreativity: "Moderate creativity within stated constraints.",
      mustAvoid: ["Do not treat tentative foundation details as stronger than written chapter canon."]
    },
    assumptionsAndGaps: {
      explicitUserRequirements: [prompt],
      inferredChoices: [`Genre/tone interpreted as: ${genreTone}`],
      missingInformation: ["Primary POV, tense, audience boundaries, main characters, setting details, and plot structure may need user review."],
      recommendedClarifyingQuestions: [
        "Who is the primary protagonist or viewpoint character?",
        "What content rating and hard exclusions should the story obey?",
        "What should Chapter 1 definitely establish or avoid?"
      ]
    }
  };
}
