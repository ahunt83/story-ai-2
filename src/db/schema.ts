import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  vector
} from "drizzle-orm/pg-core";

import { env } from "@/lib/env";

export const chapterStatusEnum = pgEnum("chapter_status", ["draft", "extracting", "pending_memory_approval", "approved"]);
export const memoryValidationStatusEnum = pgEnum("memory_validation_status", ["pending", "valid", "repaired", "invalid"]);
export const importanceEnum = pgEnum("importance", ["critical", "major", "minor"]);
export const persistenceEnum = pgEnum("persistence", ["permanent", "until_resolved", "temporary", "unclear"]);
export const aiRunOperationEnum = pgEnum("ai_run_operation", [
  "generate",
  "revise",
  "memory_check",
  "suggest_next_beat",
  "extract_memory",
  "merge_story_bible",
  "story_foundation",
  "embedding",
  "character_image_generation",
  "character_image_analysis",
  "character_development"
]);
export const aiRunStatusEnum = pgEnum("ai_run_status", ["started", "succeeded", "failed"]);
export const storyFoundationStatusEnum = pgEnum("story_foundation_status", ["draft", "approved"]);
export const characterStatusEnum = pgEnum("character_status", ["draft", "active", "inactive", "dead", "missing", "archived"]);
export const characterImportanceEnum = pgEnum("character_importance", ["protagonist", "major", "supporting", "minor", "background"]);
export const characterCreatedFromEnum = pgEnum("character_created_from", ["story_foundation", "manual", "image", "scene", "chapter_extraction", "imported"]);
export const characterCanonLevelEnum = pgEnum("character_canon_level", ["confirmed", "tentative", "mixed"]);
export const characterAssetTypeEnum = pgEnum("character_asset_type", [
  "draft",
  "canonical_reference",
  "alternate_outfit",
  "expression",
  "pose",
  "scene_image",
  "rejected"
]);
export const characterCandidateStatusEnum = pgEnum("character_candidate_status", ["pending", "added", "merged", "ignored", "background"]);
export const characterSourceTypeEnum = pgEnum("character_source_type", [
  "user_entered",
  "user_confirmed",
  "story_foundation",
  "image_generation_prompt",
  "image_extraction",
  "scene_extraction",
  "chapter_extraction",
  "ai_suggestion",
  "story_bible_merge"
]);
export const characterFieldCanonStatusEnum = pgEnum("character_field_canon_status", ["confirmed", "tentative", "suggested", "contradicted", "deprecated"]);
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

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  passwordHash: text("password_hash").notNull(),
  ...timestamps
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps
}, (table) => ({
  userIdx: index("sessions_user_idx").on(table.userId),
  tokenIdx: index("sessions_token_hash_idx").on(table.tokenHash)
}));

export const stories = pgTable("stories", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  initialPrompt: text("initial_prompt").notNull(),
  genreToneNotes: text("genre_tone_notes"),
  status: text("status").notNull().default("active"),
  ...timestamps
});

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  themePreference: text("theme_preference").notNull().default("light"),
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

export const storyFoundations = pgTable("story_foundations", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().unique().references(() => stories.id, { onDelete: "cascade" }),
  foundation: jsonb("foundation").$type<Record<string, unknown>>().notNull(),
  rawResponse: text("raw_response"),
  status: storyFoundationStatusEnum("status").notNull().default("draft"),
  ...timestamps
});

export const storyModelSettings = pgTable("story_model_settings", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().unique().references(() => stories.id, { onDelete: "cascade" }),
  chatModel: text("chat_model").notNull(),
  revisionModel: text("revision_model").notNull(),
  extractionModel: text("extraction_model").notNull(),
  embeddingModel: text("embedding_model").notNull(),
  imageModel: text("image_model").notNull(),
  visionModel: text("vision_model").notNull(),
  generationTemperature: real("generation_temperature").notNull(),
  revisionTemperature: real("revision_temperature").notNull(),
  maxTokens: integer("max_tokens").notNull(),
  ...timestamps
});

export const characters = pgTable("characters", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  displayName: text("display_name"),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  status: characterStatusEnum("status").notNull().default("draft"),
  importance: characterImportanceEnum("importance").notNull().default("supporting"),
  createdFrom: characterCreatedFromEnum("created_from").notNull().default("manual"),
  canonLevel: characterCanonLevelEnum("canon_level").notNull().default("tentative"),
  profile: jsonb("profile").$type<Record<string, unknown>>().notNull(),
  primaryImageAssetId: text("primary_image_asset_id"),
  visualSummary: text("visual_summary"),
  voiceSummary: text("voice_summary"),
  currentStateSummary: text("current_state_summary"),
  ...timestamps
}, (table) => ({
  storyNameIdx: index("characters_story_name_idx").on(table.storyId, table.name),
  storyImportanceIdx: index("characters_story_importance_idx").on(table.storyId, table.importance)
}));

export const characterImageAssets = pgTable("character_image_assets", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  characterId: text("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  type: characterAssetTypeEnum("type").notNull().default("draft"),
  uri: text("uri").notNull(),
  thumbnailUri: text("thumbnail_uri"),
  storageKey: text("storage_key"),
  mediaType: text("media_type").notNull().default("image/png"),
  imageModel: text("image_model"),
  prompt: text("prompt"),
  negativePrompt: text("negative_prompt"),
  seed: text("seed"),
  aspectRatio: text("aspect_ratio"),
  style: text("style"),
  sourceImageAssetId: text("source_image_asset_id"),
  isPrimary: boolean("is_primary").notNull().default(false),
  isCanonical: boolean("is_canonical").notNull().default(false),
  generation: jsonb("generation").$type<Record<string, unknown>>().notNull().default({}),
  extractedVisualDetails: jsonb("extracted_visual_details").$type<Record<string, unknown>>().notNull().default({}),
  userFeedback: jsonb("user_feedback").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps
}, (table) => ({
  characterAssetIdx: index("character_image_assets_character_idx").on(table.characterId),
  storyAssetIdx: index("character_image_assets_story_idx").on(table.storyId)
}));

export const characterFieldSources = pgTable("character_field_sources", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  characterId: text("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  fieldPath: text("field_path").notNull(),
  value: text("value").notNull(),
  sourceType: characterSourceTypeEnum("source_type").notNull(),
  sourceId: text("source_id"),
  confidence: text("confidence"),
  canonStatus: characterFieldCanonStatusEnum("canon_status").notNull().default("suggested"),
  ...timestamps
}, (table) => ({
  characterFieldIdx: index("character_field_sources_character_field_idx").on(table.characterId, table.fieldPath)
}));

export const characterCandidates = pgTable("character_candidates", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
  chapterMemoryId: text("chapter_memory_id").references(() => chapterMemories.id, { onDelete: "cascade" }),
  possibleName: text("possible_name").notNull(),
  confidence: text("confidence").notNull().default("medium"),
  status: characterCandidateStatusEnum("status").notNull().default("pending"),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull(),
  suggestedProfile: jsonb("suggested_profile").$type<Record<string, unknown>>().notNull().default({}),
  resolvedCharacterId: text("resolved_character_id").references(() => characters.id, { onDelete: "set null" }),
  ...timestamps
}, (table) => ({
  storyCandidateIdx: index("character_candidates_story_status_idx").on(table.storyId, table.status),
  chapterCandidateIdx: index("character_candidates_chapter_idx").on(table.chapterId)
}));

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

export const aiRuns = pgTable("ai_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  storyId: text("story_id").references(() => stories.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
  sceneId: text("scene_id").references(() => scenes.id, { onDelete: "set null" }),
  operation: aiRunOperationEnum("operation").notNull(),
  provider: text("provider").notNull().default("openrouter"),
  model: text("model").notNull(),
  status: aiRunStatusEnum("status").notNull(),
  fallbackUsed: boolean("fallback_used").notNull().default(false),
  durationMs: integer("duration_ms"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  generationId: text("generation_id"),
  providerStatus: integer("provider_status"),
  providerCode: text("provider_code"),
  errorMessage: text("error_message"),
  validationStatus: text("validation_status"),
  repaired: boolean("repaired"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps
}, (table) => ({
  storyCreatedIdx: index("ai_runs_story_created_idx").on(table.storyId, table.createdAt),
  userCreatedIdx: index("ai_runs_user_created_idx").on(table.userId, table.createdAt),
  operationIdx: index("ai_runs_operation_idx").on(table.operation)
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  stories: many(stories),
  sessions: many(sessions),
  aiRuns: many(aiRuns),
  preferences: one(userPreferences)
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

export const storiesRelations = relations(stories, ({ many, one }) => ({
  owner: one(users, { fields: [stories.ownerUserId], references: [users.id] }),
  chapters: many(chapters),
  bible: one(storyBibles),
  foundation: one(storyFoundations),
  modelSettings: one(storyModelSettings),
  characters: many(characters),
  characterCandidates: many(characterCandidates),
  aiRuns: many(aiRuns)
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
  items: many(memoryItems),
  characterCandidates: many(characterCandidates)
}));

export const storyBiblesRelations = relations(storyBibles, ({ one }) => ({
  story: one(stories, { fields: [storyBibles.storyId], references: [stories.id] })
}));

export const storyFoundationsRelations = relations(storyFoundations, ({ one }) => ({
  story: one(stories, { fields: [storyFoundations.storyId], references: [stories.id] })
}));

export const storyModelSettingsRelations = relations(storyModelSettings, ({ one }) => ({
  story: one(stories, { fields: [storyModelSettings.storyId], references: [stories.id] })
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  story: one(stories, { fields: [characters.storyId], references: [stories.id] }),
  imageAssets: many(characterImageAssets),
  fieldSources: many(characterFieldSources),
  candidates: many(characterCandidates)
}));

export const characterImageAssetsRelations = relations(characterImageAssets, ({ one }) => ({
  story: one(stories, { fields: [characterImageAssets.storyId], references: [stories.id] }),
  character: one(characters, { fields: [characterImageAssets.characterId], references: [characters.id] })
}));

export const characterFieldSourcesRelations = relations(characterFieldSources, ({ one }) => ({
  story: one(stories, { fields: [characterFieldSources.storyId], references: [stories.id] }),
  character: one(characters, { fields: [characterFieldSources.characterId], references: [characters.id] })
}));

export const characterCandidatesRelations = relations(characterCandidates, ({ one }) => ({
  story: one(stories, { fields: [characterCandidates.storyId], references: [stories.id] }),
  chapter: one(chapters, { fields: [characterCandidates.chapterId], references: [chapters.id] }),
  chapterMemory: one(chapterMemories, { fields: [characterCandidates.chapterMemoryId], references: [chapterMemories.id] }),
  resolvedCharacter: one(characters, { fields: [characterCandidates.resolvedCharacterId], references: [characters.id] })
}));

export const aiRunsRelations = relations(aiRuns, ({ one }) => ({
  user: one(users, { fields: [aiRuns.userId], references: [users.id] }),
  story: one(stories, { fields: [aiRuns.storyId], references: [stories.id] }),
  chapter: one(chapters, { fields: [aiRuns.chapterId], references: [chapters.id] }),
  scene: one(scenes, { fields: [aiRuns.sceneId], references: [scenes.id] })
}));

export const memorySimilarity = (embedding: number[]) =>
  sql<number>`1 - (${memoryItems.embedding} <=> ${JSON.stringify(embedding)}::vector)`;
