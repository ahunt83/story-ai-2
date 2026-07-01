import postgres from "postgres";
import { randomUUID } from "node:crypto";

const sql = postgres(process.env.DATABASE_URL ?? "postgres://story_ai:story_ai@localhost:5432/story_ai");

const storyId = "story_sample";
const chapterId = "chapter_sample_1";
const sceneId = "scene_sample_1";
const bibleId = "bible_sample";

const emptyBible = {
  characters: [],
  relationships: [],
  majorTimeline: [],
  worldbuilding: [],
  importantLocations: [],
  importantObjects: [],
  openThreads: [],
  resolvedThreads: [],
  continuityWarnings: [],
  updatedFromChapterNumber: 0
};

await sql.begin(async (tx) => {
  await tx`
    insert into stories (id, title, initial_prompt, genre_tone_notes, status)
    values (${storyId}, 'Sample Story', 'A writer discovers a mirror that remembers impossible drafts.', 'Literary mystery with quiet speculative elements.', 'active')
    on conflict (id) do nothing
  `;

  await tx`
    insert into chapters (id, story_id, chapter_number, title, status)
    values (${chapterId}, ${storyId}, 1, 'Chapter 1', 'draft')
    on conflict (id) do nothing
  `;

  await tx`
    insert into scenes (id, chapter_id, order_index, title, draft_text)
    values (${sceneId}, ${chapterId}, 0, 'Opening Scene', 'The page waited. So did the mirror.')
    on conflict (id) do nothing
  `;

  await tx`
    insert into story_bibles (id, story_id, bible, last_updated_from_chapter_number)
    values (${bibleId}, ${storyId}, ${sql.json(emptyBible)}, 0)
    on conflict (story_id) do nothing
  `;
});

await sql.end();

console.log(`Seeded sample story ${storyId} (${randomUUID().slice(0, 8)}).`);
