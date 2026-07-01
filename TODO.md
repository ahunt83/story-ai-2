# Story AI Remaining Build TODO

This file tracks the remaining work after the initial MVP scaffold and live workflow wiring. The current app has Next.js, Postgres/pgvector, Drizzle, OpenRouter adapters, designed screens, story creation, draft generation/revision, memory extraction, and memory commit working locally.

Status after the current build pass:

- Completed: items 1, 2, 3, 4, 5, 6, 7, 8, and 9.
- Partially completed: item 10. Sidebar navigation preserves live `chapterId`/`storyId` context, and Story Bible can resolve a story from `chapterId`; mobile drawers/sheets and broader polish remain.
- Still open: item 10 UX/responsive refinement and item 11 later production work.

Recommended build order:

- [x] Make Story Bible and Memory Approval fully live.
- [x] Add a real manuscript editor with autosave and version rollback.
- [x] Add chapter/scene navigation and next-chapter workflow.
- [x] Finish OpenRouter production behavior by adding true streaming generation/revision.
- [x] Expand workflow tests with an isolated test database and full happy-path coverage.
- [x] Prepare database migrations and setup hygiene.

Documentation rule for future builds:

- Any significant implementation change should update docs in the same pass.
- Update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for API, database, environment, or module changes.
- Update [docs/STORY_MEMORY.md](docs/STORY_MEMORY.md) for extraction, validation, prompting, retrieval, or memory schema changes.
- Update [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for UI/design-system changes.
- Update [docs/CONTINUATION_GUIDE.md](docs/CONTINUATION_GUIDE.md) and this TODO when status, next steps, or priorities change.

## 1. Live Story Bible Explorer — Completed

Status: Completed.

Goal: Replace sample Story Bible display data with real `story_bibles` and `memory_items` records.

Implementation details:

- Add route support for selected story:
  - Use `/bible?storyId=:storyId`.
  - If no `storyId`, load the most recent active story or show an empty state.
- Add API endpoints:
  - `GET /api/stories/:storyId/bible` already exists; extend it to return normalized `memoryItems`.
  - Add query params: `category`, `importance`, `q`.
  - Return characters, locations, objects, open threads, warnings, and normalized memory rows.
- Update `src/app/bible/page.tsx`:
  - Convert to a client workspace similar to `LibraryClient`.
  - Load live bible data.
  - Keep sample data only as no-story/no-memory fallback.
- Explorer tabs:
  - Characters: show `StoryBible.characters` and `memory_items.category = character_state`.
  - Plot Threads: show open/resolved threads and related warning items.
  - Locations: show important locations and location memory rows.
  - Worldbuilding: show worldbuilding rows.
  - Canon Facts: show `canon_fact`, `object`, `continuity_warning`, and `summary` rows.
- Search:
  - Client input should call the API with `q`.
  - Server should use pgvector when `q` is present and fall back to recent/important items if embeddings fail.
- Acceptance criteria:
  - [x] After committing chapter memory, Story Bible shows the newly committed facts without app restart.
  - [x] Category tabs filter correctly.
  - [x] Search returns semantically relevant `memory_items`.
  - [x] Empty state is useful when no live story exists.

## 2. Memory Approval Editing — Completed

Status: Completed.

Goal: Make the extraction approval screen a real review/edit surface before commit.

Implementation details:

- Store pending extracted memory in component state, not just display state.
- Add editable cards for:
  - summaries,
  - character states,
  - canon facts,
  - open threads,
  - continuity warnings,
  - do-not-forget items.
- Add include/exclude toggles per item:
  - Excluded items remain visible but are omitted from commit payload.
  - Use local state first; no extra DB table needed for v1.
- Add inline text editing:
  - Use textarea for summaries and content fields.
  - Use select controls for `importance` and `persistence`.
- Add validation before commit:
  - Run `chapterMemorySchema.safeParse` in the client before POST.
  - Show validation issues next to affected sections.
- Improve commit behavior:
  - `POST /api/chapters/:chapterId/commit-memory` already accepts an optional memory payload.
  - Ensure edited memory is sent in that payload.
  - On success, navigate to `/bible?storyId=:storyId`.
- Acceptance criteria:
  - [x] User can edit extracted short/medium/long summaries before commit.
  - [x] User can exclude a bad extracted fact.
  - [x] Commit stores only the approved/edited memory.
  - [x] Story Bible reflects edits, not the original raw extraction.

## 3. Real Manuscript Editor — Completed

Status: Completed.

Goal: Replace read-only prose display with an editable writing canvas that autosaves scenes.

Implementation details:

- Add API endpoint:
  - `PATCH /api/scenes/:sceneId`
  - Body: `{ draftText?: string, title?: string, orderIndex?: number }`
  - Save `updatedAt`.
- Add `src/app/api/scenes/[sceneId]/route.ts`.
- Update `WritingCanvas`:
  - Support `editable` prop.
  - Use a large textarea or contenteditable editor.
  - Preserve paper-first styling: serif font, generous line height, no heavy chrome.
- Autosave:
  - Debounce draft saves by 800-1200ms.
  - Show status: `Saved`, `Saving...`, `Unsaved`, `Save failed`.
  - Do not save when displaying sample fallback content.
- Draft versioning:
  - On manual AI generation/revision, continue saving previous draft to `draft_versions`.
  - For autosave, do not create a new version on every keystroke.
  - Add “Save Version” button if explicit snapshots are desired.
- Acceptance criteria:
  - [x] User can edit a generated draft directly.
  - [x] Reloading the page preserves edits.
  - [x] Autosave errors are visible.
  - [x] Extraction uses the latest draft text.

## 4. Draft History And Rollback — Completed

Status: Completed.

Goal: Make saved `draft_versions` usable.

Implementation details:

- Add API endpoints:
  - `GET /api/chapters/:chapterId/versions`
  - `POST /api/chapters/:chapterId/versions/:versionId/restore`
- UI:
  - Add a version drawer from the History icon.
  - Show source: `generate`, `revise`, `manual_snapshot`.
  - Show timestamp, instruction, and excerpt.
  - Add preview and restore.
- Restore behavior:
  - Restoring should create a new `draft_versions` row for the current draft before replacement.
  - Then replace active scene draft text.
- Acceptance criteria:
  - [x] User can see prior AI revisions.
  - [x] User can restore a previous draft.
  - [x] Restore does not destroy the current draft permanently.

## 5. Chapter And Scene Navigation — Completed

Status: Completed.

Goal: Turn the app from one active chapter into a multi-chapter writing environment.

Implementation details:

- Chapter list:
  - Add side/top chapter selector on Writing screens.
  - Show chapter number, title, status, word count.
- Create next chapter:
  - Use existing `POST /api/stories/:storyId/chapters`.
  - Add “New Chapter” button.
  - Navigate to `/writing?chapterId=:newChapterId`.
- Scenes:
  - Add `POST /api/chapters/:chapterId/scenes`.
  - Add `PATCH /api/scenes/:sceneId` for title/order/text.
  - Add move up/down or drag later.
- Generation scope:
  - Allow generate into selected scene.
  - Add “Generate next scene” and “Generate chapter continuation.”
- Acceptance criteria:
  - [x] User can create Chapter 2 after committing Chapter 1.
  - [x] Context builder uses Chapter 1 memory for Chapter 2 generation.
  - [x] User can add multiple scenes to a chapter.

## 6. Context Preview And Retrieval Tuning — Completed

Status: Completed.

Goal: Make the context package visible and controllable before generation.

Implementation details:

- Add UI panel:
  - Show story bible summary.
  - Previous long summary.
  - Recent medium summaries.
  - Older short summaries.
  - Semantic memory matches.
  - Open threads and continuity warnings.
- Add endpoint improvements:
  - `GET /api/chapters/:chapterId/context?query=...` already exists.
  - Add `characters=Name,Name` filter.
  - Add `categories=canon_fact,open_thread,...` filter.
  - Add `limit`.
- Retrieval ranking:
  - Rank by semantic similarity first.
  - Boost `critical` over `major` over `minor`.
  - Boost unresolved/open items.
  - Include deterministic essentials regardless of semantic rank.
- Acceptance criteria:
  - [x] User can inspect what the AI will see before generation.
  - [x] Memory Check uses the same context package shown in UI.
  - [x] Critical facts are never dropped just because semantic score is low.

## 7. OpenRouter Production Behavior — Completed

Status: Completed. Error handling, failed-call metadata, usage metadata, settings display, structured-output guidance, and true streaming generation/revision are implemented.

Goal: Make AI calls robust enough for real use.

Implementation details:

- Settings UI:
  - Show configured model names.
  - Allow editing local model settings in UI if storing settings in DB.
  - Otherwise document `.env.local` clearly.
- Streaming:
  - [x] Add streaming for generation/revision.
  - [x] Keep extraction non-streaming because structured JSON is simpler to validate.
- Error handling:
  - Surface auth, insufficient credits, unsupported structured output, and rate limits clearly.
  - Store failed AI calls in `ai_messages` metadata or a new `ai_runs` table.
- Token/cost metadata:
  - Capture `usage` from OpenRouter responses.
  - Store prompt/completion token counts.
  - Show rough cost only if reliable provider/model pricing is available.
- Model support:
  - Extraction should require structured outputs.
  - If selected model fails `response_format`, show actionable error and suggest another model.
- Acceptance criteria:
  - [x] User sees useful error when API key is missing/invalid.
  - [x] Long generation streams progress instead of waiting for one final response.
  - [x] Extraction failures preserve raw response and validation error.

## 8. Database Migrations And Hygiene — Completed

Status: Completed.

Goal: Move from prototyping schema push to repeatable migration practice.

Implementation details:

- Generate initial migration:
  - Run `npm run db:generate`.
  - Commit generated `drizzle/` migration files.
- Update README:
  - Use migrations for normal setup once generated.
  - Keep `db:push` documented as development-only.
- Add scripts:
  - `db:migrate` if using Drizzle migrator.
  - `db:reset` for local reset if safe.
  - `db:seed` for sample story data.
- Cleanup duplicate memory rows:
  - Recommitting memory currently inserts new `memory_items`.
  - Decide whether recommit should delete previous items for that `chapterMemoryId` or preserve review history.
  - Recommended v1: delete old memory items for the chapter memory before inserting edited replacements.
- Acceptance criteria:
  - [x] Fresh clone can create DB from migrations.
  - [x] Recommitting edited memory does not duplicate visible facts.

## 9. Workflow Tests — Completed

Status: Completed for the local MVP. Existing Playwright smoke tests remain, and `src/e2e/live-workflow.spec.ts` covers create story, generate, revise, extract, commit, and Story Bible verification against an isolated test database when `TEST_DATABASE_URL` is set.

Goal: Test the live product workflow, not only screen smoke.

Implementation details:

- Add isolated test database setup:
  - [x] Smoke/integration tests must not run against the user's active local working database.
  - [x] Preferred option: add a separate Docker Compose service for tests, for example Postgres on host port `5433` with database/user/password such as `story_ai_test`.
  - [x] Acceptable option: use a separate database on the same local Postgres server, for example `story_ai_test`, with a distinct `TEST_DATABASE_URL`.
  - [x] The test runner should set `DATABASE_URL=$TEST_DATABASE_URL` or load a dedicated `.env.test`.
  - [x] Test setup should apply schema to the test database before tests run.
  - [x] Test teardown should truncate/drop test data without touching the development database.
  - [x] Playwright smoke tests that create stories should use the isolated test database.
- Add Playwright test:
  - [x] Create story from Library modal.
  - [x] Land on Writing with `chapterId`.
  - [x] Generate draft.
  - [x] Open Co-writer.
  - [x] Revise draft.
  - [x] Open Extraction.
  - [x] Run extraction.
  - [x] Commit memory.
  - [x] Open Bible and assert committed memory appears.
- [x] Use deterministic no-key fallbacks for CI/local tests.
- Isolate DB state:
  - [x] Use unique test story titles.
  - [x] Prefer test database reset/truncate over deleting rows from the development database.
  - [x] Optionally delete test stories after run only inside the isolated test database.
- Add API integration tests:
  - Optional future hardening: add lower-level API tests for story/chapter creation, generate/revise, extract/commit, and direct assertions on `chapter_memories`, `story_bibles`, and `memory_items`.
- Acceptance criteria:
  - [x] One automated test covers the full happy path.
  - [x] Tests do not depend on OpenRouter network calls.
  - [x] Running smoke/integration tests never changes the user's real local story data.

## 10. UX And Responsive Refinement — Partially Completed

Status: Partially completed. Shared sidebar navigation now preserves `chapterId` or `storyId`, and `/bible?chapterId=...` resolves the matching story. Responsive drawer/sheet refinements and broader loading/error polish remain open.

Goal: Make the app feel polished across viewport sizes.

Implementation details:

- Mobile:
  - Replace stacked side panels with real drawers/sheets.
  - Context and AI controls should open as full-screen sheets.
  - Keep editor first.
- Loading/empty states:
  - Library loading state.
  - No story state.
  - No memory state.
  - AI busy state.
  - DB/API error state.
- Navigation:
  - [x] Keep selected story/chapter in URL.
  - [x] Ensure shared sidebar nav links preserve `storyId` or `chapterId` where appropriate.
- Accessibility:
  - Ensure all icon buttons have labels.
  - Ensure modal focus management.
  - Check color contrast for teal pills and muted text.
- Acceptance criteria:
  - [ ] No major overlap or hidden controls on mobile.
  - [x] User can navigate the live story without losing selected chapter.
  - [ ] Common errors are visible and recoverable.

## 11. Later Production Work — Open

Status: Open.

These are intentionally out of the current local MVP but should be tracked.

- Authentication and user-owned stories.
- Hosted Postgres with pgvector.
- Deployment configuration.
- Backups and export/import.
- Collaboration.
- Sharing/export to Markdown, DOCX, or PDF.
- Per-story model settings.
- Observability for AI calls and extraction quality.
- Cost controls and rate limits.
- Privacy/data retention controls.
