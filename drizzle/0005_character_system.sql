ALTER TYPE "ai_run_operation" ADD VALUE IF NOT EXISTS 'character_image_generation';--> statement-breakpoint
ALTER TYPE "ai_run_operation" ADD VALUE IF NOT EXISTS 'character_image_analysis';--> statement-breakpoint
ALTER TYPE "ai_run_operation" ADD VALUE IF NOT EXISTS 'character_development';--> statement-breakpoint
CREATE TYPE "public"."character_status" AS ENUM('draft', 'active', 'inactive', 'dead', 'missing', 'archived');--> statement-breakpoint
CREATE TYPE "public"."character_importance" AS ENUM('protagonist', 'major', 'supporting', 'minor', 'background');--> statement-breakpoint
CREATE TYPE "public"."character_created_from" AS ENUM('story_foundation', 'manual', 'image', 'scene', 'chapter_extraction', 'imported');--> statement-breakpoint
CREATE TYPE "public"."character_canon_level" AS ENUM('confirmed', 'tentative', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."character_asset_type" AS ENUM('draft', 'canonical_reference', 'alternate_outfit', 'expression', 'pose', 'scene_image', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."character_candidate_status" AS ENUM('pending', 'added', 'merged', 'ignored', 'background');--> statement-breakpoint
CREATE TYPE "public"."character_source_type" AS ENUM('user_entered', 'user_confirmed', 'story_foundation', 'image_generation_prompt', 'image_extraction', 'scene_extraction', 'chapter_extraction', 'ai_suggestion', 'story_bible_merge');--> statement-breakpoint
CREATE TYPE "public"."character_field_canon_status" AS ENUM('confirmed', 'tentative', 'suggested', 'contradicted', 'deprecated');--> statement-breakpoint
ALTER TABLE "story_model_settings" ADD COLUMN "image_model" text DEFAULT 'openai/gpt-image-1' NOT NULL;--> statement-breakpoint
ALTER TABLE "story_model_settings" ADD COLUMN "vision_model" text DEFAULT 'openai/gpt-4o' NOT NULL;--> statement-breakpoint
CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "character_status" DEFAULT 'draft' NOT NULL,
	"importance" "character_importance" DEFAULT 'supporting' NOT NULL,
	"created_from" "character_created_from" DEFAULT 'manual' NOT NULL,
	"canon_level" "character_canon_level" DEFAULT 'tentative' NOT NULL,
	"profile" jsonb NOT NULL,
	"primary_image_asset_id" text,
	"visual_summary" text,
	"voice_summary" text,
	"current_state_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_image_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"character_id" text NOT NULL,
	"type" "character_asset_type" DEFAULT 'draft' NOT NULL,
	"uri" text NOT NULL,
	"thumbnail_uri" text,
	"storage_key" text,
	"media_type" text DEFAULT 'image/png' NOT NULL,
	"image_model" text,
	"prompt" text,
	"negative_prompt" text,
	"seed" text,
	"aspect_ratio" text,
	"style" text,
	"source_image_asset_id" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_canonical" boolean DEFAULT false NOT NULL,
	"generation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"extracted_visual_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_feedback" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_field_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"character_id" text NOT NULL,
	"field_path" text NOT NULL,
	"value" text NOT NULL,
	"source_type" "character_source_type" NOT NULL,
	"source_id" text,
	"confidence" text,
	"canon_status" "character_field_canon_status" DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"chapter_id" text,
	"chapter_memory_id" text,
	"possible_name" text NOT NULL,
	"confidence" text DEFAULT 'medium' NOT NULL,
	"status" "character_candidate_status" DEFAULT 'pending' NOT NULL,
	"evidence" jsonb NOT NULL,
	"suggested_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_character_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_image_assets" ADD CONSTRAINT "character_image_assets_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_image_assets" ADD CONSTRAINT "character_image_assets_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_field_sources" ADD CONSTRAINT "character_field_sources_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_field_sources" ADD CONSTRAINT "character_field_sources_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_candidates" ADD CONSTRAINT "character_candidates_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_candidates" ADD CONSTRAINT "character_candidates_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_candidates" ADD CONSTRAINT "character_candidates_chapter_memory_id_chapter_memories_id_fk" FOREIGN KEY ("chapter_memory_id") REFERENCES "public"."chapter_memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_candidates" ADD CONSTRAINT "character_candidates_resolved_character_id_characters_id_fk" FOREIGN KEY ("resolved_character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "characters_story_name_idx" ON "characters" USING btree ("story_id","name");--> statement-breakpoint
CREATE INDEX "characters_story_importance_idx" ON "characters" USING btree ("story_id","importance");--> statement-breakpoint
CREATE INDEX "character_image_assets_character_idx" ON "character_image_assets" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "character_image_assets_story_idx" ON "character_image_assets" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "character_field_sources_character_field_idx" ON "character_field_sources" USING btree ("character_id","field_path");--> statement-breakpoint
CREATE INDEX "character_candidates_story_status_idx" ON "character_candidates" USING btree ("story_id","status");--> statement-breakpoint
CREATE INDEX "character_candidates_chapter_idx" ON "character_candidates" USING btree ("chapter_id");
