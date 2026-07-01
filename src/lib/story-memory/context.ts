import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { chapterMemories, memoryItems, memorySimilarity, storyBibles } from "@/db/schema";
import { createEmbeddings } from "@/lib/openrouter";
import { storyBibleSchema, type ChapterContext } from "./schema";

export async function buildContextForChapter(params: {
  storyId: string;
  targetChapterNumber: number;
  query?: string;
}): Promise<ChapterContext> {
  const [bibleRecord] = await db
    .select()
    .from(storyBibles)
    .where(eq(storyBibles.storyId, params.storyId))
    .limit(1);

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
    fallbackCategories: ["canon_fact", "character_state", "open_thread", "continuity_warning"]
  });

  return {
    storyBible: bibleRecord?.bible ? storyBibleSchema.parse(bibleRecord.bible) : null,
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
  fallbackCategories: string[];
}) {
  if (params.query) {
    const [embedding] = await createEmbeddings([params.query]);
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
        .where(eq(memoryItems.storyId, params.storyId))
        .orderBy(sql`${memoryItems.embedding} <=> ${JSON.stringify(embedding)}::vector`)
        .limit(12);

      return rows.map((row) => ({
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
      eq(memoryItems.storyId, params.storyId),
      inArray(memoryItems.category, params.fallbackCategories as Array<typeof memoryItems.category.enumValues[number]>)
    ))
    .orderBy(desc(memoryItems.createdAt))
    .limit(12);

  return rows.map((row) => ({
    ...row,
    evidenceOrBasis: row.evidenceOrBasis ?? undefined,
    sourceChapterNumber: row.sourceChapterNumber ?? undefined
  }));
}
