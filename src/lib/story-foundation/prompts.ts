import type { StoryFoundation } from "./schema";

export function buildStoryFoundationPrompt(params: {
  title: string;
  initialPrompt: string;
  genreToneNotes?: string | null;
}) {
  return `You are a story development architect for a fiction-writing application.

Convert the user's initial story idea into a structured Story Foundation record that can guide chapter and scene generation.

Rules:
- Do not write the first chapter.
- Do not continue the story as prose.
- Do not invent fixed canon beyond what is needed to create a useful starting plan.
- Infer sensible creative defaults when the prompt is incomplete, but list them in assumptionsAndGaps.inferredChoices.
- Put directly stated user requirements in assumptionsAndGaps.explicitUserRequirements.
- Put unresolved decisions in assumptionsAndGaps.missingInformation and assumptionsAndGaps.recommendedClarifyingQuestions.
- Pay close attention to audienceAndBoundaries.sexualContentLevel. If the user wants explicit, on-page, erotic, open-door, or high sexual content, include the exact marker "NSFW" in sexualContentLevel. If sexual content should be absent, implied, closed-door, or fade-to-black, do not use the NSFW marker.
- Return valid JSON matching the schema only.

STORY TITLE:
<<<
${params.title}
>>>

USER'S INITIAL STORY IDEA:
<<<
${params.initialPrompt}
>>>

OPTIONAL GENRE / TONE NOTES:
<<<
${params.genreToneNotes ?? ""}
>>>`;
}

export function buildStoryFoundationRepairPrompt(invalidResponse: string) {
  return `The previous Story Foundation response was not valid according to the required JSON schema.
Repair it without adding new story facts. Return valid JSON only.

INVALID RESPONSE:
<<<
${invalidResponse}
>>>`;
}

export function foundationToJson(foundation: StoryFoundation) {
  return JSON.stringify(foundation, null, 2);
}
