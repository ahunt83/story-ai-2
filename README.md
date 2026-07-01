# Codex Story AI

A local-first AI story writing app with email/password login, user-owned stories, per-story model settings, chapter drafting, co-writer revisions, structured continuity memory, story bible maintenance, AI-call observability, and semantic memory retrieval.

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment defaults:

   ```bash
   cp .env.example .env.local
   ```

3. Start Postgres with pgvector:

   ```bash
   docker-compose up -d
   ```

4. Run migrations:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

Open http://localhost:3000.

`npm run db:seed` creates a sample local account:

```text
email: local@example.com
password: local-password-123
```

Without seed data, create the first account at `/signup`.

## Isolated E2E Tests

The mutating Playwright workflow uses a separate test database so local story data is not touched:

```bash
docker-compose up -d test-db
npm run test:e2e:isolated
```

`test:e2e:isolated` sets `TEST_DATABASE_URL=postgres://story_ai:story_ai@localhost:5433/story_ai_test`. Playwright runs Next on `127.0.0.1:3001` with `.next-test`, resets the test database, applies generated migrations, creates `playwright@example.com` / `playwright-password`, clears `OPENROUTER_API_KEY`, and uses deterministic local AI fallbacks.

## Notes

- The app uses OpenRouter for drafting, revision, structured memory extraction, story bible merging, and embeddings.
- Without an `OPENROUTER_API_KEY`, server routes fall back to deterministic local text so the product flow remains testable.
- Settings includes per-story model overrides and recent `ai_runs` observability.
- `npm run db:push` remains available for local schema prototyping; normal setup should use generated migrations.
- The UI is based on the attached Stitch designs: paper-first writing canvas, charcoal navigation, teal AI states, and compact continuity cards.

## Project Context For Future Sessions

Before continuing work, read these files:

- [docs/CONTINUATION_GUIDE.md](docs/CONTINUATION_GUIDE.md) for current status, conventions, and what to read first.
- [docs/PRODUCT_CONTEXT.md](docs/PRODUCT_CONTEXT.md) for the product intent and user workflow.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for app structure, API routes, database tables, and verification commands.
- [docs/STORY_MEMORY.md](docs/STORY_MEMORY.md) for the extraction, validation, Story Bible, and retrieval design.
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for the attached Stitch design direction and UI rules.
- [TODO.md](TODO.md) for remaining build tasks and acceptance criteria.

Future significant builds should update the relevant docs in the same change. If behavior, architecture, API contracts, data shape, AI prompting, design conventions, setup steps, or remaining work changes, document it before handing off.
