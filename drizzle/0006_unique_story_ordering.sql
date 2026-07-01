CREATE UNIQUE INDEX "chapters_story_chapter_unique" ON "chapters" USING btree ("story_id","chapter_number");--> statement-breakpoint
CREATE UNIQUE INDEX "scenes_chapter_order_unique" ON "scenes" USING btree ("chapter_id","order_index");
