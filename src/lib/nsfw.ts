import type { StoryFoundation } from "@/lib/story-foundation/schema";

const nsfwTerms = [
  "explicit sex",
  "explicit sexual",
  "nsfw",
  "erotic",
  "erotica",
  "smut",
  "porn",
  "pornographic",
  "on-page sex",
  "graphic sex",
  "graphic sexual",
  "sexual content",
  "spicy",
  "open-door",
  "open door romance",
  "adult sexual"
];

const negatedExplicitTerms = [
  "no explicit sex",
  "no explicit sexual",
  "no on-page sex",
  "no on page sex",
  "no graphic sex",
  "no graphic sexual",
  "no erotic content",
  "without explicit sex",
  "without on-page sex",
  "without on page sex"
];

export function textSuggestsNsfw(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (!text.trim()) {
    return false;
  }

  if (negatedExplicitTerms.some((term) => text.includes(term))) {
    return false;
  }

  return nsfwTerms.some((term) => text.includes(term));
}

export function storyFoundationSuggestsNsfw(foundation: StoryFoundation) {
  const sexualContent = foundation.audienceAndBoundaries.sexualContentLevel.toLowerCase();
  if (sexualContent.includes("high") || sexualContent.includes("open-door") || sexualContent.includes("on-page")) {
    return true;
  }

  return textSuggestsNsfw(
    foundation.audienceAndBoundaries.sexualContentLevel,
    foundation.audienceAndBoundaries.romanceLevel,
    foundation.audienceAndBoundaries.contentRating,
    foundation.genre.primaryGenre,
    foundation.genre.genreBlend,
    ...foundation.genre.secondaryGenres,
    ...foundation.genre.subgenres
  );
}
