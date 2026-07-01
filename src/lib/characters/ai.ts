import { z } from "zod";

import { completeJson, generateImagesWithModel } from "@/lib/openrouter";
import type { ResolvedStoryModelSettings } from "@/lib/story-settings";
import type { StoryBible } from "@/lib/story-memory/schema";
import type { StoryFoundationContext } from "@/lib/story-foundation/schema";
import {
  imageCharacterExtractionSchema,
  imageGenerationBriefSchema,
  newCharacterCandidateSchema,
  type CharacterProfile,
  type ImageGenerationBrief
} from "./schema";

export async function createImageGenerationBrief(params: {
  profile: CharacterProfile;
  storyFoundation?: StoryFoundationContext | null;
  userRequest?: string;
  modelSettings?: ResolvedStoryModelSettings;
}) {
  const fallback = fallbackBrief(params.profile, params.userRequest);
  return completeJson({
    model: params.modelSettings?.extractionModel,
    schema: imageGenerationBriefSchema,
    format: { name: "ImageGenerationBrief", schema: z.toJSONSchema(imageGenerationBriefSchema) as Record<string, unknown> },
    messages: [
      { role: "system", content: "Return valid JSON only." },
      { role: "user", content: buildBriefPrompt(params) }
    ],
    fallback
  });
}

export async function reviseImageGenerationBrief(params: {
  profile: CharacterProfile;
  previousPrompt: string;
  userFeedback: string;
  modelSettings?: ResolvedStoryModelSettings;
}) {
  const fallback = fallbackBrief(params.profile, params.userFeedback, `${params.previousPrompt}. ${params.userFeedback}`);
  return completeJson({
    model: params.modelSettings?.extractionModel,
    schema: imageGenerationBriefSchema,
    format: { name: "RevisedImageGenerationBrief", schema: z.toJSONSchema(imageGenerationBriefSchema) as Record<string, unknown> },
    messages: [
      { role: "system", content: "Return valid JSON only." },
      { role: "user", content: buildRevisionPrompt(params) }
    ],
    fallback
  });
}

export async function generateCharacterImages(params: {
  brief: ImageGenerationBrief;
  modelSettings?: ResolvedStoryModelSettings;
  n?: number;
  aspectRatio?: string;
  seed?: number;
}) {
  return generateImagesWithModel({
    model: params.modelSettings?.imageModel ?? "openai/gpt-image-1",
    prompt: params.brief.imagePrompt,
    negativePrompt: params.brief.negativePrompt,
    n: params.n ?? 1,
    aspectRatio: params.aspectRatio ?? "3:4",
    seed: params.seed,
    fallbackPrompt: params.brief.characterName || params.brief.imagePrompt
  });
}

export async function analyzeCharacterImage(params: {
  profile: CharacterProfile;
  imageUrl: string;
  storyFoundation?: StoryFoundationContext | null;
  modelSettings?: ResolvedStoryModelSettings;
}) {
  const fallback = {
    characterId: params.profile.id,
    characterNameIfKnown: params.profile.name,
    visibleAppearance: {
      overallAesthetic: params.profile.visualDesign.overallAesthetic || "Unclear from local fallback image.",
      clothing: params.profile.visualDesign.clothingStyle || "Unclear",
      posture: params.profile.visualDesign.postureBodyLanguage || "Unclear"
    },
    visualImpressionsNotCanon: [],
    suggestedProfileUpdates: {
      visualDesign: {
        canonicalSummary: params.profile.visualDesign.canonicalSummary || "User should review the generated visual before accepting canonical details.",
        descriptionForProse: params.profile.visualDesign.descriptionForProse || params.profile.visualDesign.canonicalSummary,
        descriptionForImageGeneration: params.profile.visualDesign.descriptionForImageGeneration || params.profile.visualDesign.canonicalSummary
      }
    },
    conflictsWithExistingProfile: [],
    unclearDetails: ["Live image analysis requires OPENROUTER_API_KEY."],
    confidence: "low" as const
  };

  return completeJson({
    model: params.modelSettings?.visionModel,
    schema: imageCharacterExtractionSchema,
    format: { name: "ImageCharacterExtraction", schema: z.toJSONSchema(imageCharacterExtractionSchema) as Record<string, unknown> },
    messages: [
      { role: "system", content: "Return valid JSON only. Describe only visible details; never infer private identity, morality, sexuality, nationality, exact age, or backstory from appearance." },
      {
        role: "user",
        content: [
          { type: "text", text: buildImageAnalysisPrompt(params) },
          { type: "image_url", image_url: { url: params.imageUrl } }
        ]
      }
    ],
    fallback
  });
}

export async function extractCharacterCandidates(params: {
  chapterText: string;
  existingCharacters: Array<{ id: string; name: string }>;
  storyFoundation?: StoryFoundationContext | null;
  modelSettings?: ResolvedStoryModelSettings;
}) {
  const fallback = { newCharacterCandidates: [] as Array<z.infer<typeof newCharacterCandidateSchema>> };
  const schema = z.object({ newCharacterCandidates: z.array(newCharacterCandidateSchema) });
  return completeJson({
    model: params.modelSettings?.extractionModel,
    schema,
    format: { name: "NewCharacterCandidates", schema: z.toJSONSchema(schema) as Record<string, unknown> },
    messages: [
      { role: "system", content: "Return valid JSON only." },
      { role: "user", content: buildCandidatePrompt(params) }
    ],
    fallback
  });
}

function buildBriefPrompt(params: {
  profile: CharacterProfile;
  storyFoundation?: StoryFoundationContext | null;
  userRequest?: string;
}) {
  return `You are a character visual design assistant for a fiction-writing application.

Create a clear image-generation brief. Focus only on visual design. Preserve locked visual details. Do not invent major backstory unless it directly affects visual appearance.

STORY FOUNDATION:
<<<
${params.storyFoundation ? JSON.stringify(params.storyFoundation, null, 2) : ""}
>>>

CHARACTER PROFILE:
<<<
${JSON.stringify(params.profile, null, 2)}
>>>

USER VISUAL REQUEST:
<<<
${params.userRequest ?? ""}
>>>`;
}

function buildRevisionPrompt(params: {
  profile: CharacterProfile;
  previousPrompt: string;
  userFeedback: string;
}) {
  return `Revise a character image-generation prompt.

Preserve character identity and all locked visual details. Apply the requested changes clearly. Do not accidentally change age, face structure, body type, outfit identity, or genre unless asked.

CHARACTER PROFILE:
<<<
${JSON.stringify(params.profile, null, 2)}
>>>

PREVIOUS IMAGE PROMPT:
<<<
${params.previousPrompt}
>>>

USER FEEDBACK:
<<<
${params.userFeedback}
>>>`;
}

function buildImageAnalysisPrompt(params: {
  profile: CharacterProfile;
  storyFoundation?: StoryFoundationContext | null;
}) {
  return `Analyze the provided character image and extract details that can help fill a character profile.

Only describe what is visible. Label impressions as visual impressions, not canon. If a detail conflicts with the existing profile, flag it instead of overwriting.

EXISTING CHARACTER PROFILE:
<<<
${JSON.stringify(params.profile, null, 2)}
>>>

STORY CONTEXT:
<<<
${params.storyFoundation ? JSON.stringify(params.storyFoundation, null, 2) : ""}
>>>`;
}

function buildCandidatePrompt(params: {
  chapterText: string;
  existingCharacters: Array<{ id: string; name: string }>;
  storyFoundation?: StoryFoundationContext | null;
}) {
  return `Analyze the scene/chapter and identify new characters who should be added to the Story Bible.

Extract a candidate only if they are named, speak more than a passing line, affect the plot, have a relationship to an existing character, possess important knowledge, are likely to reappear, create/resolve conflict, or are visually/narratively distinctive.

SCENE OR CHAPTER TEXT:
<<<
${params.chapterText}
>>>

EXISTING CHARACTER LIST:
<<<
${JSON.stringify(params.existingCharacters, null, 2)}
>>>

STORY CONTEXT:
<<<
${params.storyFoundation ? JSON.stringify(params.storyFoundation, null, 2) : ""}
>>>`;
}

function fallbackBrief(profile: CharacterProfile, userRequest?: string, forcedPrompt?: string) {
  const locked = profile.visualDesign.doNotChange;
  const visual = [
    profile.visualDesign.descriptionForImageGeneration,
    profile.visualDesign.canonicalSummary,
    profile.visualDesign.hair,
    profile.visualDesign.eyes,
    profile.visualDesign.clothingStyle,
    profile.visualDesign.overallAesthetic,
    userRequest
  ].filter(Boolean).join(", ");

  return {
    characterId: profile.id,
    characterName: profile.name,
    visualGoal: "Create a consistent character portrait.",
    coreAppearance: profile.visualDesign.canonicalSummary || visual,
    faceAndExpression: profile.visualDesign.face,
    hair: profile.visualDesign.hair,
    bodyAndPosture: profile.visualDesign.postureBodyLanguage || profile.visualDesign.heightBuild,
    clothing: profile.visualDesign.clothingStyle,
    accessories: profile.visualDesign.signatureItems,
    distinctiveFeatures: profile.visualDesign.distinguishingFeatures,
    settingOrBackground: "",
    mood: profile.visualDesign.overallAesthetic,
    artDirection: "Polished character concept art, story-appropriate, consistent visual identity.",
    mustInclude: locked,
    mustPreserve: locked,
    mustAvoid: [],
    imagePrompt: forcedPrompt || `Character portrait of ${profile.name}. ${visual || "Develop a distinctive, story-appropriate visual identity."}`,
    negativePrompt: "",
    variationNotes: "Vary pose, expression, lighting, and small accessories unless locked."
  };
}

export function buildStoryBibleCharacterSnapshot(profile: CharacterProfile) {
  return {
    id: profile.id,
    name: profile.name,
    importance: profile.importance,
    role_in_story: profile.storyFunction.roleInStory,
    current_status: profile.status,
    visual_summary: profile.visualDesign.descriptionForProse || profile.visualDesign.canonicalSummary,
    canonical_image_asset_ids: [],
    personality_summary: profile.personality.summary,
    voice_summary: profile.voice.dialogueStyle,
    goals: [
      profile.goalsAndMotivations.externalGoal,
      profile.goalsAndMotivations.internalNeed,
      ...profile.goalsAndMotivations.shortTermGoals
    ].filter(Boolean),
    relationships: profile.relationships,
    knowledge_state: profile.knowledgeState,
    current_story_state: profile.currentStoryState,
    must_remember: profile.continuity.mustRemember,
    must_not_reveal_yet: profile.continuity.mustNotRevealYet,
    open_threads: profile.continuity.openThreads
  };
}

export function storyBibleForCharacterPrompt(storyBible: StoryBible | null) {
  if (!storyBible) return null;
  return {
    updatedFromChapterNumber: storyBible.updatedFromChapterNumber,
    characters: storyBible.characters.map((character) => ({
      name: character.name,
      roleInStory: character.roleInStory,
      statusAtChapterEnd: character.statusAtChapterEnd,
      goalsAndMotivations: character.goalsAndMotivations
    })),
    openThreads: storyBible.openThreads.slice(0, 12)
  };
}
