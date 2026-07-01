CREATE TYPE "public"."chapter_status" AS ENUM('draft', 'extracting', 'pending_memory_approval', 'approved');--> statement-breakpoint
CREATE TYPE "public"."importance" AS ENUM('critical', 'major', 'minor');--> statement-breakpoint
CREATE TYPE "public"."memory_category" AS ENUM('canon_fact', 'character_state', 'relationship', 'location', 'object', 'worldbuilding', 'open_thread', 'resolved_thread', 'foreshadowing', 'conflict', 'style', 'continuity_warning', 'ambiguity', 'summary');--> statement-breakpoint
CREATE TYPE "public"."memory_validation_status" AS ENUM('pending', 'valid', 'repaired', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."persistence" AS ENUM('permanent', 'until_resolved', 'temporary', 'unclear');--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"chapter_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_memories" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"chapter_number" integer NOT NULL,
	"memory" jsonb NOT NULL,
	"validation_status" "memory_validation_status" DEFAULT 'pending' NOT NULL,
	"extraction_model" text,
	"raw_response" text,
	"validation_error" text,
	"approved_for_bible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text,
	"approved_text" text,
	"status" "chapter_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text,
	"chapter_id" text,
	"source" text NOT NULL,
	"instruction" text,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"chapter_id" text,
	"chapter_memory_id" text,
	"source_chapter_number" integer,
	"category" "memory_category" NOT NULL,
	"label" text NOT NULL,
	"content" text NOT NULL,
	"importance" "importance" NOT NULL,
	"persistence" "persistence",
	"evidence_or_basis" text,
	"payload" jsonb NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"chapter_id" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"title" text,
	"draft_text" text DEFAULT '' NOT NULL,
	"approved_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"initial_prompt" text NOT NULL,
	"genre_tone_notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_bibles" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"bible" jsonb NOT NULL,
	"last_updated_from_chapter_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_bibles_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_memories" ADD CONSTRAINT "chapter_memories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_memories" ADD CONSTRAINT "chapter_memories_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_versions" ADD CONSTRAINT "draft_versions_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_versions" ADD CONSTRAINT "draft_versions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_chapter_memory_id_chapter_memories_id_fk" FOREIGN KEY ("chapter_memory_id") REFERENCES "public"."chapter_memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_bibles" ADD CONSTRAINT "story_bibles_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapter_memories_story_chapter_idx" ON "chapter_memories" USING btree ("story_id","chapter_number");--> statement-breakpoint
CREATE INDEX "chapters_story_chapter_idx" ON "chapters" USING btree ("story_id","chapter_number");--> statement-breakpoint
CREATE INDEX "memory_items_story_category_idx" ON "memory_items" USING btree ("story_id","category");--> statement-breakpoint
CREATE INDEX "memory_items_embedding_idx" ON "memory_items" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "scenes_chapter_order_idx" ON "scenes" USING btree ("chapter_id","order_index");