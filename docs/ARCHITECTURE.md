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
- `src/lib/openrouter.ts`: OpenRouter client and deterministic embedding fallback.
- `src/e2e`: Playwright smoke tests.
- `db/init`: Postgres init scripts, including pgvector extension setup.
- `docs`: project handoff and system documentation.

## Database Tables

Defined in `src/db/schema.ts`.

- `stories`: story metadata and initial prompt.
- `chapters`: chapter number, status, approved text.
- `scenes`: ordered scene records with draft and approved text.
- `draft_versions`: prior drafts saved before AI generation/revision replacement.
- `ai_messages`: user/assistant messages for generation and revision sessions.
- `chapter_memories`: full extracted `ChapterMemory` JSONB per chapter.
- `story_bibles`: compact current canonical Story Bible JSONB per story.
- `memory_items`: normalized searchable memory rows with category, importance, persistence, evidence, payload JSONB, and pgvector embedding.

Important current limitation:

- Streaming generation is still a future production-hardening step. Generation/revision currently show progress states and store usage/error metadata when OpenRouter returns it.

## API Routes

Story routes:

- `POST /api/stories`
- `GET /api/stories`
- `GET /api/stories/:storyId`
- `POST /api/stories/:storyId/chapters`
- `GET /api/stories/:storyId/bible?category=&importance=&q=`

Chapter routes:

- `GET /api/chapters/:chapterId`
- `POST /api/chapters/:chapterId/generate`
- `POST /api/chapters/:chapterId/revise`
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
- `/writing`: Writing screen.
- `/writing/co-writer`: AI co-writer/revision screen.
- `/writing/extraction`: Memory extraction approval screen.
- `/bible`: Story Bible explorer.
- `/settings`: Basic settings notes.

Live route conventions:

- Prefer `?chapterId=:chapterId` for writing and extraction screens.
- Prefer `?storyId=:storyId` for Story Bible. If omitted, the page loads the most recently updated active story.

## Key Components

- `AppShell`: shared left nav, top bar, responsive shell.
- `LibraryClient`: live story loading and creation modal.
- `WritingWorkspace`: live chapter loading, scene selection, autosave, generation/revision, version history, memory check, next beat.
- `ExtractionWorkspace`: live memory extraction, editable approval, include/exclude toggles, validation, and commit flow.
- `WritingCanvas`: manuscript surface with editable textarea support.
- `ContinuityContextPanel`: live context package/sidebar display.

## Verification Commands

Run these after significant changes:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

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
