# Design System And UI Direction

This app is based on the user-provided Stitch archive:

`/Users/andy/Downloads/stitch_ai_narrative_writing_interface.zip`

The archive contained five designed screens:

- `story_dashboard`
- `writing_interface`
- `ai_co_writer_interface`
- `memory_extraction_approval`
- `story_bible_continuity_explorer`

It also included `codex/DESIGN.md`, whose core guidance is captured here so future sessions do not need the original zip.

## Brand Feel

The app should feel like a high-end, distraction-free writing environment for a creative professional.

Core mood:

- literary,
- focused,
- precise,
- calm,
- author-first,
- AI-assisted but not AI-dominated.

The writing surface should feel like paper. The memory/AI tools should feel like a precise system layer.

## Visual Principles

- Paper-first for creative output.
- System-second for analytical input.
- Use generous whitespace around prose.
- Use dense but readable cards for memory data.
- Use tonal layers and low-contrast outlines, not heavy shadows.
- Avoid generic SaaS/dashboard styling where possible.

## Palette

Important colors:

```css
--parchment-base: #fdfcfb;
--ink-charcoal: #121212;
--primary-container: #1c1b1b;
--on-primary-container: #858383;
--intelligence-teal: #0d9488;
--intelligence-glow: #ccfbf1;
--memory-border: #e5e1d8;
--surface-container-low: #f5f3f3;
--surface-container: #efeded;
--outline-variant: #c4c7c7;
```

Usage:

- Parchment for the main writing canvas.
- Charcoal for fixed system navigation.
- Teal for AI status, memory importance, active nav, and progress.
- Warm gray/border colors for metadata and cards.

## Typography

Design intent:

- Serif for prose and major literary headings.
- Sans-serif for UI, metadata, memory cards, controls.

Preferred font names from the design:

- `Source Serif 4`
- `Hanken Grotesk`

Current implementation uses CSS stacks that include those names with local fallbacks, not `next/font/google`, because build-time Google font fetching failed in the restricted environment.

Important rule:

- Keep letter spacing at `0` for display text where possible.
- UI labels may use modest uppercase tracking.

## Layout

Desktop:

- Fixed left nav: 320px.
- Top app bar: 64px.
- Writing canvas max width: about 800px.
- Right-side continuity/co-writer panel: about 320px to 480px depending screen.

Tablet/mobile:

- Editor should be primary.
- Side panels should collapse into drawers/sheets.
- Mobile implementation is still a TODO; current responsive behavior is serviceable but not final.

## Components

Important existing components:

- `AppShell`: fixed charcoal nav and top app bar.
- `WritingCanvas`: manuscript surface.
- `ContinuityContextPanel`: AI/context/memory sidebar.
- `MemoryCard`: memory fact card.
- `ImportancePill`: critical/major/minor visual tag.
- `Button`: shared button treatment.

Expected component behavior:

- Memory cards should have white backgrounds, thin warm borders, and low/no shadow.
- Status pills:
  - Critical: solid teal.
  - Major: teal outline.
  - Minor: muted gray.
- Progress indicators should be thin teal bars, not heavy spinners.
- Buttons should have modest radius, 8px or less.
- Use lucide icons rather than Material Symbols in React implementation.

## Screen Intent

Library:

- Shows active stories, progress, word/memory counts, and story creation.
- Should feel like a manuscript library, not a marketing landing page.

Writing:

- Focused manuscript canvas.
- Continuity context visible but secondary.
- Memory Check and Suggest Next Beat actions should be available without approving a chapter.

AI Co-writer:

- Shows revision chat/control surface.
- AI changes should feel reviewable.
- Current behavior replaces draft and stores previous version.

Memory Approval:

- Read-only chapter text beside extracted memory.
- User should be able to review, edit, include/exclude, and commit.
- Editing/toggling is a TODO.

Story Bible:

- Continuity explorer for characters, plot threads, locations, worldbuilding, and canon facts.
- Should eventually use real `story_bibles` and `memory_items`.

## Design Guardrails

Future UI work should:

- preserve the paper/ink/teal identity,
- keep writing first and tools second,
- avoid nested cards,
- avoid oversized marketing hero sections,
- avoid decorative gradient orbs/blobs,
- keep text from overlapping on mobile and desktop,
- use icons for common actions,
- add useful loading, empty, and error states.
