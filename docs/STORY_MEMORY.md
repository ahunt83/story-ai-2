# Story Memory System

## Goal

The story memory system preserves continuity across long fiction projects while controlling prompt context size. It does this by storing structured chapter memory, maintaining a compact global Story Bible, normalizing important memory items, and retrieving relevant facts for future generation.

## Chapter Approval Flow

When a chapter is finalized:

1. App gathers the chapter text.
2. App builds optional existing story context.
3. App asks the AI extractor to return strict `ChapterMemory` JSON.
4. App validates the JSON with Zod.
5. If invalid, app retries once with a repair prompt.
6. App stores the memory in `chapter_memories`.
7. User can review, edit, include, or exclude extracted memory in the extraction UI.
8. Client validation runs `chapterMemorySchema.safeParse` before commit.
9. Commit updates the Story Bible, replaces prior normalized rows for the chapter memory, creates embeddings, and marks the chapter approved.
10. Extraction, Story Bible merge, and embedding work writes `ai_runs` rows for observability.

## Core Types

Defined in `src/lib/story-memory/schema.ts`.

Enums:

```ts
type Importance = "critical" | "major" | "minor";
type Persistence = "permanent" | "until_resolved" | "temporary" | "unclear";
type NarrativePerson = "first" | "second" | "third" | "mixed" | "unclear";
type Tense = "past" | "present" | "mixed" | "unclear";
```

`ChapterMemory` top-level sections:

- `chapterMetadata`
- `summaries`
- `mainEventsInOrder`
- `canonFactsEstablished`
- `characterStates`
- `relationshipUpdates`
- `locations`
- `importantObjects`
- `worldbuilding`
- `timeline`
- `knowledgeState`
- `openThreads`
- `resolvedThreads`
- `foreshadowingAndSetups`
- `conflicts`
- `styleAndVoice`
- `continuityWarnings`
- `doNotForget`
- `uncertaintiesOrAmbiguities`

Each important memory item should include:

- `importance`
- `persistence`
- `evidenceOrBasis`

`evidenceOrBasis` is important. It reduces hallucinated memory and helps users debug why a fact was stored.

## Summaries

Each chapter memory stores:

- `longSummary`: used for the immediately previous chapter.
- `mediumSummary`: used for recent chapters.
- `shortSummary`: used for older chapters.

The original brief suggested:

- Long: 500-800 words.
- Medium: 150-250 words.
- Short: 40-75 words.

Current fallback summaries are shorter because they are deterministic local development fallbacks. Live model extraction should aim for the brief lengths.

## What To Capture

Store details that may matter later.

Useful test:

Could forgetting this cause a contradiction, weaken a future payoff, confuse character motivation, or break the reader's understanding of the story?

Capture:

- plot events and consequences,
- character goals, emotions, decisions, injuries, promises, secrets, knowledge, and possessions,
- relationship changes and unresolved tensions,
- locations and their significance,
- important objects, clues, documents, weapons, artifacts, symbols, and vehicles,
- worldbuilding rules, organizations, history, politics, technology, magic, culture, and mythology,
- timeline and chronology,
- open mysteries, dangers, conflicts, promises, and foreshadowing,
- style, voice, POV, tense, tone, motifs, and constraints,
- ambiguities and possible contradictions.

Do not store trivial description unless it is likely to matter later.

## Story Bible

The Story Bible is the compact current canonical state for a story.

It should include:

- characters,
- relationships,
- major timeline,
- worldbuilding rules,
- important locations,
- important objects,
- open and resolved threads,
- narrative style constraints,
- continuity warnings.

Do not replace per-chapter memories with the Story Bible. Use both:

- per-chapter memories preserve history,
- Story Bible preserves the current useful state.

## Context Builder

Implemented in `src/lib/story-memory/context.ts`.

Context for future writing should include, in priority order:

1. Global Story Bible.
2. Long summary of the immediately previous chapter.
3. Medium summaries from previous two or three chapters.
4. Short summaries from older chapters.
5. Critical and major canon facts.
6. Relevant character states.
7. Relevant open threads.
8. Relevant style/voice constraints.
9. Semantic matches from `memory_items`.

Current implementation:

- Retrieves prior chapter memories.
- Builds deterministic summary windows.
- Pulls critical facts and major/critical open threads.
- Uses embeddings when `query` is supplied.
- Uses the selected story's embedding model for semantic retrieval.
- Supports `characters`, `categories`, and `limit` filters in the context API.
- Falls back to recent important memory items if no query/embedding.
- Boosts critical/major/open-thread/continuity-warning rows after semantic matching.
- Keeps deterministic critical facts in the context package even when semantic rank is low.
- Shows the same context package in the writing sidebar that generation and Memory Check use.

## OpenRouter Integration

Implemented in:

- `src/lib/openrouter.ts`
- `src/lib/story-memory/ai.ts`
- `src/lib/story-memory/prompts.ts`

AI uses:

- chat completions for generation/revision,
- structured JSON output for extraction/merge where supported,
- embeddings for memory item retrieval.
- per-story model settings when present, falling back to environment defaults.

No-key behavior:

- Text generation uses deterministic fallback prose.
- Extraction uses `createMockChapterMemory`.
- Story Bible merge uses local merge fallback.
- Embeddings use deterministic local numeric vectors.

Keep this no-key path working for tests and local development.

Production behavior:

- OpenRouter auth, insufficient credits, rate limits, and structured-output support errors are mapped to user-facing messages.
- Generation/revision store returned token usage in `ai_messages.metadata` when available.
- Failed generation/revision attempts are stored in `ai_messages.metadata` with `status: "failed"`.
- `ai_runs` stores operational metadata for generation, revision, memory check, next beat, extraction, Story Bible merge, and embeddings.
- `ai_runs` captures operation, model, status, fallback usage, token usage, duration, generation id, provider errors, validation status, repair status, and compact metadata such as memory item count.
- The Settings screen shows recent story-scoped AI runs.
- Generation streams directly into the active scene and persists only after the stream completes.
- Revision streams into a preview; accepting the preview persists it and stores the previous draft version.
- Keep extraction non-streaming because structured JSON validation is simpler.

## Validation And Repair

Validation is Zod-based.

Expected behavior:

- JSON must parse.
- Required top-level sections must exist.
- Summaries must be non-empty.
- Important arrays must be arrays.
- Enum values must match supported values.
- No prose outside JSON for structured extraction.

If validation fails:

- Retry once with repair prompt.
- Repair prompt must not add new facts.
- If still invalid, store/report validation failure.

Current implementation has the core validation and fallback structure. The approval UI now validates edited memory before posting it.

## Normalized Memory Items

Implemented in `src/lib/story-memory/normalize.ts`.

Current normalized categories include:

- `summary`
- `canon_fact`
- `character_state`
- `open_thread`
- `continuity_warning`
- `location`
- `object`
- `worldbuilding`

Each normalized memory item stores:

- category,
- label,
- content,
- importance,
- persistence,
- evidence,
- payload JSONB,
- embedding.

These rows power search/retrieval and should eventually power the live Story Bible explorer.
