import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { chapterMemories, characters, memoryItems, memorySimilarity, storyBibles, storyFoundations } from "@/db/schema";
import { createEmbeddingsWithModel } from "@/lib/openrouter";
import { env } from "@/lib/env";
import { compactCharacterContext, normalizeProfile } from "@/lib/characters/profiles";
import { buildStoryFoundationContext } from "@/lib/story-foundation/context";
import { storyFoundationSchema } from "@/lib/story-foundation/schema";
import { storyBibleSchema, type ChapterContext } from "./schema";

export async function buildContextForChapter(params: {
  storyId: string;
  targetChapterNumber: number;
  query?: string;
  characters?: string[];
  categories?: string[];
  limit?: number;
  embeddingModel?: string;
}): Promise<ChapterContext> {
  const [bibleRecord] = await db
    .select()
    .from(storyBibles)
    .where(eq(storyBibles.storyId, params.storyId))
    .limit(1);

  const [foundationRecord] = await db
    .select()
    .from(storyFoundations)
    .where(eq(storyFoundations.storyId, params.storyId))
    .limit(1);

  const parsedFoundation = foundationRecord?.foundation
    ? storyFoundationSchema.parse(foundationRecord.foundation)
    : null;

  const memories = await db
    .select()
    .from(chapterMemories)
    .where(and(eq(chapterMemories.storyId, params.storyId), lt(chapterMemories.chapterNumber, params.targetChapterNumber)))
    .orderBy(asc(chapterMemories.chapterNumber));

  const previous = memories.find((memory) => memory.chapterNumber === params.targetChapterNumber - 1);
  const recent = memories.filter((memory) => memory.chapterNumber >= params.targetChapterNumber - 3 && memory.chapterNumber <= params.targetChapterNumber - 2);
  const older = memories.filter((memory) => memory.chapterNumber <= params.targetChapterNumber - 4);

  const criticalFacts = memories.flatMap((record) => {
    const memory = record.memory as { canonFactsEstablished?: Array<Record<string, unknown>> };
    return (memory.canonFactsEstablished ?? []).filter((fact) => fact.importance === "critical");
  });

  const openThreads = memories.flatMap((record) => {
    const memory = record.memory as { openThreads?: Array<Record<string, unknown>> };
    return (memory.openThreads ?? []).filter((thread) => thread.importance === "critical" || thread.importance === "major");
  });

  const relevantMemoryItems = await findRelevantMemoryItems({
    storyId: params.storyId,
    query: params.query,
    characters: params.characters,
    categories: params.categories,
    limit: params.limit ?? 12,
    embeddingModel: params.embeddingModel ?? env.openRouterEmbeddingModel,
    fallbackCategories: params.categories?.length ? params.categories : ["canon_fact", "character_state", "open_thread", "continuity_warning"]
  });

  const characterRows = await db
    .select()
    .from(characters)
    .where(eq(characters.storyId, params.storyId))
    .orderBy(asc(characters.name))
    .limit(16);

  return {
    storyBible: bibleRecord?.bible ? storyBibleSchema.parse(bibleRecord.bible) : null,
    storyFoundationContext: parsedFoundation
      ? buildStoryFoundationContext(parsedFoundation, foundationRecord.status)
      : null,
    previousLongSummary: getSummary(previous?.memory, "longSummary"),
    recentMediumSummaries: recent.map((record) => ({
      chapterNumber: record.chapterNumber,
      summary: getSummary(record.memory, "mediumSummary") ?? ""
    })).filter((item) => item.summary.length > 0),
    olderShortSummaries: older.map((record) => ({
      chapterNumber: record.chapterNumber,
      summary: getSummary(record.memory, "shortSummary") ?? ""
    })).filter((item) => item.summary.length > 0),
    criticalFacts: criticalFacts as ChapterContext["criticalFacts"],
    relevantMemoryItems,
    charactersForThisChapter: characterRows.map((character) => compactCharacterContext(normalizeProfile(character.profile, character.id, character.name))),
    openThreads: openThreads as ChapterContext["openThreads"],
    styleAndVoice: bibleRecord?.bible && typeof bibleRecord.bible === "object"
      ? storyBibleSchema.parse(bibleRecord.bible).narrativeStyleConstraints
      : undefined
  };
}

function getSummary(memory: unknown, key: "longSummary" | "mediumSummary" | "shortSummary") {
  if (!memory || typeof memory !== "object") {
    return undefined;
  }

  const summaries = (memory as { summaries?: Record<string, unknown> }).summaries;
  const value = summaries?.[key];
  return typeof value === "string" ? value : undefined;
}

async function findRelevantMemoryItems(params: {
  storyId: string;
  query?: string;
  characters?: string[];
  categories?: string[];
  limit: number;
  embeddingModel: string;
  fallbackCategories: string[];
}) {
  const categoryFilter = params.categories?.filter((category) =>
    memoryItems.category.enumValues.includes(category as typeof memoryItems.category.enumValues[number])
  ) as Array<typeof memoryItems.category.enumValues[number]> | undefined;
  const characterFilter = params.characters?.map((character) => character.trim()).filter(Boolean);
  const filters = [
    eq(memoryItems.storyId, params.storyId),
    categoryFilter?.length ? inArray(memoryItems.category, categoryFilter) : undefined,
    characterFilter?.length ? inArray(memoryItems.label, characterFilter) : undefined
  ].filter(Boolean);

  if (params.query) {
    const [embedding] = await createEmbeddingsWithModel([params.query], params.embeddingModel);
    if (embedding) {
      const rows = await db
        .select({
          id: memoryItems.id,
          category: memoryItems.category,
          label: memoryItems.label,
          content: memoryItems.content,
          importance: memoryItems.importance,
          evidenceOrBasis: memoryItems.evidenceOrBasis,
          sourceChapterNumber: memoryItems.sourceChapterNumber,
          similarity: memorySimilarity(embedding)
        })
        .from(memoryItems)
        .where(and(...filters))
        .orderBy(sql`${memoryItems.embedding} <=> ${JSON.stringify(embedding)}::vector`)
        .limit(Math.max(params.limit * 4, params.limit));

      return rankMemoryRows(rows).slice(0, params.limit).map((row) => ({
        ...row,
        evidenceOrBasis: row.evidenceOrBasis ?? undefined,
        sourceChapterNumber: row.sourceChapterNumber ?? undefined,
        similarity: Number(row.similarity)
      }));
    }
  }

  const rows = await db
    .select({
      id: memoryItems.id,
      category: memoryItems.category,
      label: memoryItems.label,
      content: memoryItems.content,
      importance: memoryItems.importance,
      evidenceOrBasis: memoryItems.evidenceOrBasis,
      sourceChapterNumber: memoryItems.sourceChapterNumber
    })
    .from(memoryItems)
    .where(and(
      ...filters,
      inArray(memoryItems.category, params.fallbackCategories as Array<typeof memoryItems.category.enumValues[number]>)
    ))
    .orderBy(desc(memoryItems.createdAt))
    .limit(Math.max(params.limit * 2, params.limit));

  return rankMemoryRows(rows).slice(0, params.limit).map((row) => ({
    ...row,
    evidenceOrBasis: row.evidenceOrBasis ?? undefined,
    sourceChapterNumber: row.sourceChapterNumber ?? undefined
  }));
}

function rankMemoryRows<T extends { importance: string; category: string; similarity?: number }>(rows: T[]) {
  const importanceScore: Record<string, number> = { critical: 30, major: 15, minor: 0 };
  const categoryScore: Record<string, number> = {
    open_thread: 12,
    continuity_warning: 10,
    canon_fact: 8,
    character_state: 6
  };

  return [...rows].sort((a, b) => {
    const aScore = (a.similarity ?? 0) * 100 + (importanceScore[a.importance] ?? 0) + (categoryScore[a.category] ?? 0);
    const bScore = (b.similarity ?? 0) * 100 + (importanceScore[b.importance] ?? 0) + (categoryScore[b.category] ?? 0);
    return bScore - aScore;
  });
}
