ALTER TABLE "stories" ADD COLUMN "is_nsfw" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "nsfw_mode" boolean DEFAULT false NOT NULL;
