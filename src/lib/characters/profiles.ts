import type { CharacterProfile, ImageCharacterExtraction, CharacterContextCard } from "./schema";
import { characterProfileSchema } from "./schema";

export function createCharacterProfile(params: {
  id: string;
  name: string;
  createdFrom?: CharacterProfile["createdFrom"];
  importance?: CharacterProfile["importance"];
  roleInStory?: string;
  visualSeed?: string;
  voiceSeed?: string;
  sourceNote?: string;
}): CharacterProfile {
  return characterProfileSchema.parse({
    id: params.id,
    name: params.name,
    displayName: params.name,
    status: "draft",
    importance: params.importance ?? "supporting",
    createdFrom: params.createdFrom ?? "manual",
    canonLevel: "tentative",
    storyFunction: {
      roleInStory: params.roleInStory ?? ""
    },
    visualDesign: {
      canonicalSummary: params.visualSeed ?? "",
      descriptionForImageGeneration: params.visualSeed ?? ""
    },
    voice: {
      dialogueStyle: params.voiceSeed ?? ""
    },
    sourceTracking: {
      explicitUserRequirements: params.sourceNote ? [params.sourceNote] : [],
      aiSuggestions: [],
      imageInferredDetails: [],
      sceneEstablishedFacts: [],
      chapterEstablishedFacts: [],
      userConfirmedFacts: [],
      conflictsOrUncertainties: []
    }
  });
}

export function normalizeProfile(input: unknown, fallbackId: string, fallbackName: string): CharacterProfile {
  const parsed = characterProfileSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  return createCharacterProfile({ id: fallbackId, name: fallbackName });
}

export function applyAcceptedVisualExtraction(profile: CharacterProfile, extraction: ImageCharacterExtraction) {
  const updates = extraction.suggestedProfileUpdates.visualDesign;
  const visualDesign = { ...profile.visualDesign, ...compactObject(updates) };
  const imageFacts = Object.values(extraction.visibleAppearance)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return characterProfileSchema.parse({
    ...profile,
    canonLevel: profile.canonLevel === "confirmed" ? "mixed" : profile.canonLevel,
    visualDesign,
    sourceTracking: {
      ...profile.sourceTracking,
      imageInferredDetails: unique([...profile.sourceTracking.imageInferredDetails, ...imageFacts]),
      conflictsOrUncertainties: unique([
        ...profile.sourceTracking.conflictsOrUncertainties,
        ...extraction.conflictsWithExistingProfile.map((conflict) => JSON.stringify(conflict))
      ])
    }
  });
}

export function compactCharacterContext(profile: CharacterProfile): CharacterContextCard {
  return {
    id: profile.id,
    name: profile.displayName || profile.name,
    importance: profile.importance,
    roleInChapter: profile.storyFunction.roleInStory,
    visualSummary: profile.visualDesign.descriptionForProse || profile.visualDesign.canonicalSummary,
    personalitySummary: profile.personality.summary || profile.personality.traits.join(", "),
    voiceNotes: [
      profile.voice.dialogueStyle,
      profile.voice.speechRhythm,
      profile.voice.formalityLevel,
      profile.voice.voiceDo.join("; "),
      profile.voice.voiceDoNot.length ? `Avoid: ${profile.voice.voiceDoNot.join("; ")}` : ""
    ].filter(Boolean).join(" "),
    currentLocation: profile.currentStoryState.currentLocation,
    currentPhysicalState: profile.currentStoryState.physicalState,
    currentEmotionalState: profile.currentStoryState.emotionalState,
    currentGoal: profile.currentStoryState.currentGoal || profile.goalsAndMotivations.externalGoal,
    currentKnowledge: profile.knowledgeState.knows,
    secretsOrHiddenAgenda: [
      profile.goalsAndMotivations.hiddenAgenda,
      ...profile.knowledgeState.secretsTheyAreHiding
    ].filter(Boolean),
    relationshipNotes: profile.relationships.map((relationship) => JSON.stringify(relationship)),
    mustRemember: profile.continuity.mustRemember,
    mustNotContradict: profile.continuity.mustNotContradict,
    mustNotRevealYet: profile.continuity.mustNotRevealYet
  };
}

export function profileSummaries(profile: CharacterProfile) {
  return {
    visualSummary: profile.visualDesign.descriptionForProse || profile.visualDesign.canonicalSummary || null,
    voiceSummary: profile.voice.dialogueStyle || profile.voice.speechRhythm || null,
    currentStateSummary: [
      profile.currentStoryState.currentLocation,
      profile.currentStoryState.physicalState,
      profile.currentStoryState.emotionalState,
      profile.currentStoryState.currentGoal
    ].filter(Boolean).join(" ") || null
  };
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (Array.isArray(item)) return item.length > 0;
      return item !== undefined && item !== null && item !== "";
    })
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
