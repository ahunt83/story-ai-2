# Codex Story AI

A local single-user AI story writing app with chapter drafting, co-writer revisions, structured continuity memory, story bible maintenance, and semantic memory retrieval.

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

## Notes

- The app uses OpenRouter for drafting, revision, structured memory extraction, story bible merging, and embeddings.
- Without an `OPENROUTER_API_KEY`, server routes fall back to deterministic local text so the product flow remains testable.
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
