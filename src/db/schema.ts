import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  vector
} from "drizzle-orm/pg-core";

import { env } from "@/lib/env";

export const chapterStatusEnum = pgEnum("chapter_status", ["draft", "extracting", "pending_memory_approval", "approved"]);
export const memoryValidationStatusEnum = pgEnum("memory_validation_status", ["pending", "valid", "repaired", "invalid"]);
export const importanceEnum = pgEnum("importance", ["critical", "major", "minor"]);
export const persistenceEnum = pgEnum("persistence", ["permanent", "until_resolved", "temporary", "unclear"]);
export const memoryCategoryEnum = pgEnum("memory_category", [
  "canon_fact",
  "character_state",
  "relationship",
  "location",
  "object",
  "worldbuilding",
  "open_thread",
  "resolved_thread",
  "foreshadowing",
  "conflict",
  "style",
  "continuity_warning",
  "ambiguity",
  "summary"
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const stories = pgTable("stories", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  initialPrompt: text("initial_prompt").notNull(),
  genreToneNotes: text("genre_tone_notes"),
  status: text("status").notNull().default("active"),
  ...timestamps
});

export const chapters = pgTable("chapters", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title"),
  approvedText: text("approved_text"),
  status: chapterStatusEnum("status").notNull().default("draft"),
  ...timestamps
}, (table) => ({
  storyChapterIdx: index("chapters_story_chapter_idx").on(table.storyId, table.chapterNumber)
}));

export const scenes = pgTable("scenes", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
  title: text("title"),
  draftText: text("draft_text").notNull().default(""),
  approvedText: text("approved_text"),
  ...timestamps
}, (table) => ({
  chapterOrderIdx: index("scenes_chapter_order_idx").on(table.chapterId, table.orderIndex)
}));

export const draftVersions = pgTable("draft_versions", {
  id: text("id").primaryKey(),
  sceneId: text("scene_id").references(() => scenes.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  instruction: text("instruction"),
  content: text("content").notNull(),
  ...timestamps
});

export const aiMessages = pgTable("ai_messages", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps
});

export const chapterMemories = pgTable("chapter_memories", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  memory: jsonb("memory").$type<Record<string, unknown>>().notNull(),
  validationStatus: memoryValidationStatusEnum("validation_status").notNull().default("pending"),
  extractionModel: text("extraction_model"),
  rawResponse: text("raw_response"),
  validationError: text("validation_error"),
  approvedForBible: boolean("approved_for_bible").notNull().default(false),
  ...timestamps
}, (table) => ({
  storyChapterMemoryIdx: index("chapter_memories_story_chapter_idx").on(table.storyId, table.chapterNumber)
}));

export const storyBibles = pgTable("story_bibles", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().unique().references(() => stories.id, { onDelete: "cascade" }),
  bible: jsonb("bible").$type<Record<string, unknown>>().notNull(),
  lastUpdatedFromChapterNumber: integer("last_updated_from_chapter_number").notNull().default(0),
  ...timestamps
});

export const memoryItems = pgTable("memory_items", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
  chapterMemoryId: text("chapter_memory_id").references(() => chapterMemories.id, { onDelete: "cascade" }),
  sourceChapterNumber: integer("source_chapter_number"),
  category: memoryCategoryEnum("category").notNull(),
  label: text("label").notNull(),
  content: text("content").notNull(),
  importance: importanceEnum("importance").notNull(),
  persistence: persistenceEnum("persistence"),
  evidenceOrBasis: text("evidence_or_basis"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  embedding: vector("embedding", { dimensions: env.openRouterEmbeddingDimensions }),
  ...timestamps
}, (table) => ({
  storyCategoryIdx: index("memory_items_story_category_idx").on(table.storyId, table.category),
  embeddingIdx: index("memory_items_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops"))
}));

export const storiesRelations = relations(stories, ({ many, one }) => ({
  chapters: many(chapters),
  bible: one(storyBibles)
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  story: one(stories, { fields: [chapters.storyId], references: [stories.id] }),
  scenes: many(scenes),
  memories: many(chapterMemories)
}));

export const scenesRelations = relations(scenes, ({ one, many }) => ({
  chapter: one(chapters, { fields: [scenes.chapterId], references: [chapters.id] }),
  versions: many(draftVersions)
}));

export const chapterMemoriesRelations = relations(chapterMemories, ({ one, many }) => ({
  story: one(stories, { fields: [chapterMemories.storyId], references: [stories.id] }),
  chapter: one(chapters, { fields: [chapterMemories.chapterId], references: [chapters.id] }),
  items: many(memoryItems)
}));

export const storyBiblesRelations = relations(storyBibles, ({ one }) => ({
  story: one(stories, { fields: [storyBibles.storyId], references: [stories.id] })
}));

export const memorySimilarity = (embedding: number[]) =>
  sql<number>`1 - (${memoryItems.embedding} <=> ${JSON.stringify(embedding)}::vector)`;
