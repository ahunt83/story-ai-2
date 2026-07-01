# Continuation Guide For Future Codex Sessions

This repository is a local single-user AI story writing app. It was started from a clean repo using two user-provided inputs:

- A memory-system implementation brief at `/Users/andy/Downloads/codex_story_memory_implementation_brief.md`.
- A Stitch design archive at `/Users/andy/Downloads/stitch_ai_narrative_writing_interface.zip`.

Those files may not always be available in future sessions, so the key decisions from them are captured in this `docs/` folder.

## Read First

Read in this order:

1. `README.md`
2. `TODO.md`
3. `docs/PRODUCT_CONTEXT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STORY_MEMORY.md`
6. `docs/DESIGN_SYSTEM.md`

## Current Status

Built and verified:

- Next.js App Router app with TypeScript and Tailwind.
- Postgres + pgvector via Docker Compose.
- Drizzle schema for stories, chapters, scenes, draft versions, AI messages, chapter memories, story bibles, and normalized memory items.
- OpenRouter adapter for generation, revision, extraction, story bible merge, and embeddings.
- Deterministic local AI fallbacks when `OPENROUTER_API_KEY` is empty.
- Library screen with live story loading and story creation modal.
- Writing screen with chapter/scene navigation, editable manuscript canvas, autosave, live draft generation, and manual snapshots.
- Co-writer screen with selected-scene revision and draft version history restore.
- Memory Check and Suggest Next Beat API actions.
- Memory extraction approval screen that can run extraction, edit/toggle/validate memory, and commit approved memory.
- Story Bible screen reads live `story_bibles` and normalized `memory_items` with tabs/search/filtering.
- Context preview panel reads the same context endpoint used by generation and Memory Check.
- Generated Drizzle migration files and `db:migrate`/`db:seed` scripts.
- Unit tests and Playwright smoke tests.

Last known verification:

- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes.
- `npm run test:e2e` passes.
- API smoke flow passed locally: create story, generate draft, extract memory, commit memory.

## Local Setup Notes

The local machine used `docker-compose`, not `docker compose`.

Typical setup:

```bash
npm install
cp .env.example .env.local
docker-compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Open the app at `http://127.0.0.1:3000` or `http://localhost:3000`.

If Docker fails because the daemon is unavailable, this machine previously used Colima:

```bash
colima start
docker-compose up -d
```

## Documentation Rule

Future Codex sessions should update documentation whenever a significant build changes project behavior or implementation details.

Update docs when changing:

- public routes or API contracts,
- database schema or migrations,
- story memory schema, extraction prompts, retrieval, or validation,
- OpenRouter/model behavior,
- UI routes, layout conventions, or design tokens,
- setup, test, or deployment commands,
- remaining work or project priorities.

Use this rule before final handoff: if a future session would need to know it, write it down.

## Important Implementation Defaults

- Keep the app local single-user until explicitly asked otherwise.
- Prefer Postgres JSONB for full memories and normalized `memory_items` for retrieval.
- Keep deterministic no-key AI fallbacks so development and tests do not require OpenRouter.
- Keep sample display data for useful no-story/no-memory empty states.
- Preserve the attached design direction: paper-first writing, charcoal system navigation, teal AI/memory accents, serif manuscript text.
- Add tests with each substantial workflow change.

## Recommended Next Work

The strongest next slice is production hardening:

1. Add streaming generation/revision responses.
2. Add full Playwright workflow coverage for create, edit, autosave reload, version restore, extract, approve, commit, and Story Bible verification.
3. Exercise migrations against a clean database in CI/deployment setup.

See `TODO.md` for detailed implementation steps and acceptance criteria.
