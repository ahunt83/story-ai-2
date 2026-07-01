import type { ChapterMemory, Importance, Persistence } from "./schema";

export type ReviewableSection =
  | "canonFactsEstablished"
  | "characterStates"
  | "openThreads"
  | "continuityWarnings"
  | "doNotForget";

export type ReviewKey = `${ReviewableSection}:${number}`;

export type ReviewInclusions = Partial<Record<ReviewKey, boolean>>;

export function reviewKey(section: ReviewableSection, index: number): ReviewKey {
  return `${section}:${index}`;
}

export function isIncluded(inclusions: ReviewInclusions, section: ReviewableSection, index: number) {
  return inclusions[reviewKey(section, index)] !== false;
}

export function approvedMemory(memory: ChapterMemory, inclusions: ReviewInclusions): ChapterMemory {
  return {
    ...memory,
    canonFactsEstablished: memory.canonFactsEstablished.filter((_, index) => isIncluded(inclusions, "canonFactsEstablished", index)),
    characterStates: memory.characterStates.filter((_, index) => isIncluded(inclusions, "characterStates", index)),
    openThreads: memory.openThreads.filter((_, index) => isIncluded(inclusions, "openThreads", index)),
    continuityWarnings: memory.continuityWarnings.filter((_, index) => isIncluded(inclusions, "continuityWarnings", index)),
    doNotForget: memory.doNotForget.filter((_, index) => isIncluded(inclusions, "doNotForget", index))
  };
}

export const importanceOptions: Importance[] = ["critical", "major", "minor"];
export const persistenceOptions: Persistence[] = ["permanent", "until_resolved", "temporary", "unclear"];
