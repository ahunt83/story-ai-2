# Architecture

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Drizzle ORM
- Postgres with pgvector
- OpenRouter API
- Vitest
- Playwright

## Environment

Expected environment variables:

```bash
DATABASE_URL=postgres://story_ai:story_ai@localhost:5432/story_ai
TEST_DATABASE_URL=postgres://story_ai:story_ai@localhost:5433/story_ai_test
OPENROUTER_API_KEY=
OPENROUTER_CHAT_MODEL=anthropic/claude-sonnet-4.5
OPENROUTER_EXTRACT_MODEL=openai/gpt-4o
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
OPENROUTER_EMBEDDING_DIMENSIONS=1536
```

Without `OPENROUTER_API_KEY`, AI routes intentionally use deterministic fallbacks. Keep this behavior so local testing remains possible.

## Main Directories

- `src/app`: Next app routes and API routes.
- `src/components`: UI shell and client workspaces.
- `src/db`: Drizzle connection and schema.
- `src/lib/story-memory`: memory schemas, prompts, AI helpers, normalization, context builder.
- `src/lib/auth.ts`: local email/password auth, session cookies, and session lookup helpers.
- `src/lib/story-settings.ts`: per-story model settings defaults and resolution.
- `src/lib/ai-runs.ts`: durable AI run logging helpers.
- `src/lib/openrouter.ts`: OpenRouter client and deterministic embedding fallback.
- `src/e2e`: Playwright smoke tests.
- `src/e2e/global-setup.ts`: guarded Playwright test database reset and migration setup when `TEST_DATABASE_URL` is set.
- `db/init`: Postgres init scripts, including pgvector extension setup.
- `docs`: project handoff and system documentation.

## Database Tables

Defined in `src/db/schema.ts`.

- `stories`: story metadata and initial prompt.
- `users`: local email/password accounts.
- `sessions`: hashed opaque session tokens with expiry.
- `story_model_settings`: per-story model overrides for generation, revision, extraction, embeddings, temperatures, and max tokens.
- `ai_runs`: canonical operational log for AI calls, including model, operation, status, fallback usage, token usage, duration, provider errors, generation ids, validation status, repair status, and compact metadata.
- `chapters`: chapter number, status, approved text.
- `scenes`: ordered scene records with draft and approved text.
- `draft_versions`: prior drafts saved before AI generation/revision replacement.
- `ai_messages`: user/assistant messages for generation and revision sessions.
- `chapter_memories`: full extracted `ChapterMemory` JSONB per chapter.
- `story_bibles`: compact current canonical Story Bible JSONB per story.
- `memory_items`: normalized searchable memory rows with category, importance, persistence, evidence, payload JSONB, and pgvector embedding.

Streaming behavior:

- Generation and revision support streamed `application/x-ndjson` responses when the client sends `Accept: application/x-ndjson`.
- Generation streams directly into the active scene and saves when the full response completes.
- Revision streams into a preview; `POST /api/chapters/:chapterId/apply-revision` saves the accepted preview, preserves the previous draft version, and logs usage metadata.
- Failed streaming attempts preserve failed-call metadata in `ai_messages`.
- `ai_messages` remains the transcript/log of user and assistant content; `ai_runs` is the operational observability table.
- Generation, revision, memory check, next beat, extraction, Story Bible merge, and memory embedding paths write `ai_runs`, including deterministic fallback runs.

Auth and ownership:

- Main app pages redirect unauthenticated users to `/login`.
- API routes require a session except the auth endpoints.
- `stories.owner_user_id` scopes stories to one owner. Story-derived resources resolve through their parent story and return not-found semantics for inaccessible IDs.
- Legacy unowned local stories are claimed by the first authenticated user who accesses them; signup also claims all unowned stories when the first user is created.
- Signup is intended for local bootstrap. After a user exists, new arbitrary signups are rejected.

Model settings:

- New stories copy defaults from `OPENROUTER_CHAT_MODEL`, `OPENROUTER_EXTRACT_MODEL`, and `OPENROUTER_EMBEDDING_MODEL`.
- Story settings can override generation, revision, extraction, and embedding models plus generation/revision temperatures and max tokens.
- Embedding dimensions remain environment/schema-level through `OPENROUTER_EMBEDDING_DIMENSIONS`.

## API Routes

Story routes:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/stories`
- `GET /api/stories`
- `GET /api/stories/:storyId`
- `POST /api/stories/:storyId/chapters`
- `GET /api/stories/:storyId/bible?category=&importance=&q=`
- `GET /api/stories/:storyId/model-settings`
- `PATCH /api/stories/:storyId/model-settings`
- `GET /api/stories/:storyId/ai-runs`

Chapter routes:

- `GET /api/chapters/:chapterId`
- `POST /api/chapters/:chapterId/generate`
- `POST /api/chapters/:chapterId/revise`
- `POST /api/chapters/:chapterId/apply-revision`
- `POST /api/chapters/:chapterId/memory-check`
- `POST /api/chapters/:chapterId/suggest-next-beat`
- `POST /api/chapters/:chapterId/extract-memory`
- `POST /api/chapters/:chapterId/commit-memory`
- `GET /api/chapters/:chapterId/context?query=&characters=&categories=&limit=`
- `POST /api/chapters/:chapterId/scenes`
- `GET /api/chapters/:chapterId/versions`
- `POST /api/chapters/:chapterId/versions`
- `POST /api/chapters/:chapterId/versions/:versionId/restore`
- `PATCH /api/scenes/:sceneId`

## UI Routes

- `/`: Library.
- `/login`: Email/password sign in.
- `/signup`: Local bootstrap signup.
- `/writing`: Writing screen.
- `/writing/co-writer`: AI co-writer/revision screen.
- `/writing/extraction`: Memory extraction approval screen.
- `/bible`: Story Bible explorer.
- `/settings`: Environment notes, per-story model settings, and recent AI runs.

Live route conventions:

- Prefer `?chapterId=:chapterId` for writing and extraction screens.
- Prefer `?storyId=:storyId` for Story Bible. If omitted, the page loads the most recently updated active story.
- `/bible?chapterId=:chapterId` is also supported so shared navigation can preserve live context from a writing URL.

## Key Components

- `AppShell`: shared left nav, top bar, responsive shell.
- `LibraryClient`: live story loading and creation modal.
- `WritingWorkspace`: live chapter loading, scene selection, autosave, generation/revision, version history, memory check, next beat.
- `ExtractionWorkspace`: live memory extraction, editable approval, include/exclude toggles, validation, and commit flow.
- `WritingCanvas`: manuscript surface with editable textarea support.
- `ContinuityContextPanel`: live context package/sidebar display.
- `StorySettingsClient`: per-story model editor and recent AI run viewer.

## Verification Commands

Run these after significant changes:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Run the mutating happy-path Playwright workflow against the isolated test database:

```bash
docker-compose up -d test-db
npm run test:e2e:isolated
```

When `TEST_DATABASE_URL` is present, Playwright starts Next on `127.0.0.1:3001` with `DATABASE_URL=$TEST_DATABASE_URL`, `NEXT_DIST_DIR=.next-test`, and an empty `OPENROUTER_API_KEY`. It resets the test database and applies the generated migration before tests run. The reset guard refuses non-local URLs or database names that do not include `test`.

Database verification:

```bash
docker-compose up -d
npm run db:migrate
npm run db:seed
```

Use `npm run db:push` only for development schema prototyping. Normal setup should use generated migrations in `drizzle/`.

## Known Local Notes

- This machine used `docker-compose`, not `docker compose`.
- Colima may need to be started before Docker commands:

```bash
colima start
```

- Next production build may require escalated execution in sandboxed Codex contexts because Turbopack/CSS workers can be blocked.
