ALTER TYPE "public"."ai_run_operation" ADD VALUE IF NOT EXISTS 'story_foundation';--> statement-breakpoint
CREATE TYPE "public"."story_foundation_status" AS ENUM('draft', 'approved');--> statement-breakpoint
CREATE TABLE "story_foundations" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"foundation" jsonb NOT NULL,
	"raw_response" text,
	"status" "story_foundation_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_foundations_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
ALTER TABLE "story_foundations" ADD CONSTRAINT "story_foundations_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
