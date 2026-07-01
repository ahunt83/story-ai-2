import type { ChapterMemory, Importance, Persistence } from "./schema";

export type NormalizedMemoryItem = {
  category: string;
  label: string;
  content: string;
  importance: Importance;
  persistence?: Persistence;
  evidenceOrBasis?: string;
  payload: Record<string, unknown>;
};

function item(params: NormalizedMemoryItem): NormalizedMemoryItem {
  return params;
}

export function normalizeChapterMemory(memory: ChapterMemory): NormalizedMemoryItem[] {
  const items: NormalizedMemoryItem[] = [];

  for (const fact of memory.canonFactsEstablished) {
    items.push(item({
      category: "canon_fact",
      label: fact.category,
      content: fact.fact,
      importance: fact.importance,
      persistence: fact.persistence,
      evidenceOrBasis: fact.evidenceOrBasis,
      payload: fact
    }));
  }

  for (const character of memory.characterStates) {
    items.push(item({
      category: "character_state",
      label: character.name,
      content: [
        character.statusAtChapterEnd,
        character.locationAtChapterEnd,
        character.emotionalState,
        ...character.goalsAndMotivations
      ].filter(Boolean).join(" "),
      importance: character.importance,
      persistence: character.persistence,
      evidenceOrBasis: character.evidenceOrBasis,
      payload: character
    }));
  }

  for (const thread of memory.openThreads) {
    items.push(item({
      category: "open_thread",
      label: thread.thread,
      content: `${thread.status}. ${thread.futureRelevance ?? ""}`.trim(),
      importance: thread.importance,
      persistence: thread.persistence,
      evidenceOrBasis: thread.evidenceOrBasis,
      payload: thread
    }));
  }

  for (const warning of memory.continuityWarnings) {
    items.push(item({
      category: "continuity_warning",
      label: warning.warning,
      content: [warning.possibleContradiction, warning.suggestedHandling].filter(Boolean).join(" "),
      importance: warning.importance,
      persistence: warning.persistence,
      evidenceOrBasis: warning.evidenceOrBasis,
      payload: warning
    }));
  }

  for (const location of memory.locations) {
    items.push(item({
      category: "location",
      label: location.name,
      content: location.significance,
      importance: location.importance,
      persistence: location.persistence,
      evidenceOrBasis: location.evidenceOrBasis,
      payload: location
    }));
  }

  for (const object of memory.importantObjects) {
    items.push(item({
      category: "object",
      label: object.name,
      content: object.significance,
      importance: object.importance,
      persistence: object.persistence,
      evidenceOrBasis: object.evidenceOrBasis,
      payload: object
    }));
  }

  return items.filter((memoryItem) => memoryItem.content.length > 0);
}
