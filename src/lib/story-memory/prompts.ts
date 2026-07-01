import type { ChapterContext, ChapterMemory, StoryBible } from "./schema";

export function buildGenerationPrompt(params: {
  storyTitle: string;
  direction: string;
  context: ChapterContext;
}) {
  return `You are an expert fiction co-writer.

Write polished narrative prose for "${params.storyTitle}".

Use the provided continuity context. Do not contradict known facts. Keep the style constraints in mind.

WRITING DIRECTION:
<<<
${params.direction}
>>>

CONTEXT PACKAGE:
<<<
${JSON.stringify(params.context, null, 2)}
>>>`;
}

export function buildRevisionPrompt(params: {
  currentDraft: string;
  command: string;
  context: ChapterContext;
}) {
  return `You are revising a fiction draft.

Return the full revised draft only. Preserve continuity and incorporate the user's command.

USER COMMAND:
<<<
${params.command}
>>>

CURRENT DRAFT:
<<<
${params.currentDraft}
>>>

CONTEXT PACKAGE:
<<<
${JSON.stringify(params.context, null, 2)}
>>>`;
}

export function buildExtractionPrompt(params: {
  chapterText: string;
  optionalExistingStoryContext?: ChapterContext | null;
}) {
  return `You are a story continuity analyst for a fiction-writing application.

Analyze the completed chapter and extract a compact but comprehensive memory record for future chapter generation.

Rules:
- Do not continue the story.
- Do not rewrite the chapter.
- Do not invent facts that are not present in the chapter.
- Label cautious interpretations as "inferred".
- Mark ambiguous details as ambiguous instead of resolving them yourself.
- Extract only details that may matter for future continuity, character behavior, plot payoff, worldbuilding consistency, timeline clarity, or narrative voice.
- Return valid JSON only.

CHAPTER TEXT:
<<<
${params.chapterText}
>>>

OPTIONAL EXISTING STORY CONTEXT:
<<<
${params.optionalExistingStoryContext ? JSON.stringify(params.optionalExistingStoryContext, null, 2) : ""}
>>>`;
}

export function buildRepairPrompt(invalidResponse: string) {
  return `The previous response was not valid according to the required JSON schema.
Repair it without adding new facts. Return valid JSON only.

INVALID RESPONSE:
<<<
${invalidResponse}
>>>`;
}

export function buildBibleMergePrompt(params: {
  existingStoryBible: StoryBible | null;
  newChapterMemory: ChapterMemory;
}) {
  return `You are maintaining a compact story bible for a fiction-writing application.

Update the story bible so it remains accurate, compact, and useful for writing future chapters.

Rules:
- Preserve established canon.
- Add new facts that matter for future continuity.
- Update character states, relationships, locations, objects, open threads, resolved threads, worldbuilding, and style constraints.
- Mark resolved threads as resolved rather than deleting them if their consequences still matter.
- Do not invent new story events.
- If the new chapter contradicts the existing bible, preserve both versions and add a continuity warning.
- Return valid JSON only.

EXISTING STORY BIBLE:
<<<
${params.existingStoryBible ? JSON.stringify(params.existingStoryBible, null, 2) : "null"}
>>>

NEW CHAPTER MEMORY:
<<<
${JSON.stringify(params.newChapterMemory, null, 2)}
>>>`;
}
