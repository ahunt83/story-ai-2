import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { memoryItems, memorySimilarity, storyBibles } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { createEmbeddings } from "@/lib/openrouter";
import { storyBibleSchema } from "@/lib/story-memory/schema";

const memoryCategories = memoryItems.category.enumValues;
const importanceValues = memoryItems.importance.enumValues;

export async function GET(request: Request, context: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId } = await context.params;
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const importance = url.searchParams.get("importance");
    const query = url.searchParams.get("q")?.trim();

    const [bible] = await db.select().from(storyBibles).where(eq(storyBibles.storyId, storyId)).limit(1);
    const parsedBible = bible?.bible ? storyBibleSchema.parse(bible.bible) : null;
    const normalizedCategory = category && memoryCategories.includes(category as typeof memoryCategories[number])
      ? category as typeof memoryCategories[number]
      : undefined;
    const normalizedImportance = importance && importanceValues.includes(importance as typeof importanceValues[number])
      ? importance as typeof importanceValues[number]
      : undefined;

    const memoryRows = await findMemoryRows({
      storyId,
      category: normalizedCategory,
      importance: normalizedImportance,
      query
    });

    return ok({
      bible: parsedBible,
      storyBible: parsedBible,
      characters: parsedBible?.characters ?? [],
      locations: parsedBible?.importantLocations ?? [],
      objects: parsedBible?.importantObjects ?? [],
      openThreads: parsedBible?.openThreads ?? [],
      resolvedThreads: parsedBible?.resolvedThreads ?? [],
      warnings: parsedBible?.continuityWarnings ?? [],
      memoryItems: memoryRows,
      lastUpdatedFromChapterNumber: bible?.lastUpdatedFromChapterNumber ?? 0
    });
  } catch (error) {
    return fail(error);
  }
}

async function findMemoryRows(params: {
  storyId: string;
  category?: typeof memoryCategories[number];
  importance?: typeof importanceValues[number];
  query?: string;
}) {
  const filters = [
    eq(memoryItems.storyId, params.storyId),
    params.category ? eq(memoryItems.category, params.category) : undefined,
    params.importance ? eq(memoryItems.importance, params.importance) : undefined
  ].filter(Boolean);

  if (params.query) {
    try {
      const [embedding] = await createEmbeddings([params.query]);
      if (embedding) {
        const rows = await db
          .select({
            id: memoryItems.id,
            category: memoryItems.category,
            label: memoryItems.label,
            content: memoryItems.content,
            importance: memoryItems.importance,
            persistence: memoryItems.persistence,
            evidenceOrBasis: memoryItems.evidenceOrBasis,
            sourceChapterNumber: memoryItems.sourceChapterNumber,
            similarity: memorySimilarity(embedding)
          })
          .from(memoryItems)
          .where(and(...filters))
          .orderBy(sql`${memoryItems.embedding} <=> ${JSON.stringify(embedding)}::vector`)
          .limit(24);

        return rows.map(cleanMemoryRow);
      }
    } catch {
      // Fall through to plain text search when embeddings are unavailable.
    }
  }

  const textFilter = params.query
    ? or(
      ilike(memoryItems.label, `%${params.query}%`),
      ilike(memoryItems.content, `%${params.query}%`),
      ilike(memoryItems.evidenceOrBasis, `%${params.query}%`)
    )
    : undefined;

  const rows = await db
    .select({
      id: memoryItems.id,
      category: memoryItems.category,
      label: memoryItems.label,
      content: memoryItems.content,
      importance: memoryItems.importance,
      persistence: memoryItems.persistence,
      evidenceOrBasis: memoryItems.evidenceOrBasis,
      sourceChapterNumber: memoryItems.sourceChapterNumber
    })
    .from(memoryItems)
    .where(and(...[...filters, textFilter].filter(Boolean)))
    .orderBy(desc(memoryItems.createdAt))
    .limit(24);

  return rows.map(cleanMemoryRow);
}

function cleanMemoryRow<T extends {
  persistence: string | null;
  evidenceOrBasis: string | null;
  sourceChapterNumber: number | null;
  similarity?: number;
}>(row: T) {
  return {
    ...row,
    persistence: row.persistence ?? undefined,
    evidenceOrBasis: row.evidenceOrBasis ?? undefined,
    sourceChapterNumber: row.sourceChapterNumber ?? undefined,
    similarity: row.similarity === undefined ? undefined : Number(row.similarity)
  };
}
