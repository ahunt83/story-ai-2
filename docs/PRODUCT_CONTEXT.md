# Product Context

## Product Idea

Codex Story AI is an AI-assisted fiction writing web app. The AI writes story drafts, the user chats with the AI to request changes, and approved chapters are analyzed into structured story memory.

The product should help a writer maintain continuity across a long story without sending the full manuscript to the model for every future chapter.

## Core User Workflow

1. User creates a story from an initial premise, genre, tone, and style direction.
2. App creates Chapter 1 and an opening scene.
3. User asks the AI to generate a chapter or scene draft.
4. User chats with the AI to revise the draft.
5. User finalizes/approves the chapter.
6. App extracts structured `ChapterMemory`.
7. User reviews and eventually edits/approves the extracted memory.
8. App commits memory to:
   - the per-chapter memory record,
   - the global Story Bible,
   - normalized searchable memory items,
   - vector embeddings for future semantic retrieval.
9. Future chapter generation uses the Story Bible, summaries, structured memory, open threads, character states, and relevant semantic matches instead of the whole story text.

## Product Principle

Summaries are for narrative flow. Structured memory is for continuity.

Do not rely only on summaries. Structured memory must track what characters know, believe, want, own, promise, hide, and what remains unresolved.

## Current Scope

Current intended scope:

- Local-first app with real email/password login and user-owned stories.
- Multiple users are supported at the ownership boundary, but collaboration and shared stories are not in scope yet.
- No billing, OAuth, collaboration, or deployment automation.
- Docker Postgres is the database.
- OpenRouter is the AI provider.
- Per-story model settings can override generation, revision, extraction, and embedding models.
- Chapters can contain scenes, but memory extraction commits at chapter level.
- AI revisions stream into a reviewable preview; accepting replaces the active draft while preserving prior versions.
- Embeddings are included from the start through pgvector.
- AI calls are logged to `ai_runs` for local observability.

## Current Product State

Live flows currently implemented:

- Signup/login/logout with secure local sessions.
- Library loads real local stories.
- New Story modal creates story, Chapter 1, Opening Scene, and Story Bible.
- Writing screen generates a draft into the active chapter.
- Co-writer screen streams revision previews and saves previous draft versions when changes are accepted.
- Memory Check and Suggest Next Beat use context-aware backend routes.
- Extraction screen runs memory extraction, supports editing/toggling extracted memory, and commits approved memory to the Story Bible.
- Story Bible explorer reads live story memory with filters and semantic search.
- Settings includes per-story model overrides and recent AI run observability.

Still prototype or partial:

- User administration is intentionally minimal after first local signup.
- Collaboration and shared story membership are deferred.
- Cost estimation is deferred until reliable model pricing is available.

## User Experience Direction

The user should feel like an author first and a technologist second. The AI/memory tools should be powerful but quiet, appearing as a precise continuity assistant alongside a calm writing surface.

Avoid making the app feel like a generic admin dashboard. The primary experience is writing and revising prose.
