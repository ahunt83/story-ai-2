export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://story_ai:story_ai@localhost:5432/story_ai",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterChatModel: process.env.OPENROUTER_CHAT_MODEL ?? "anthropic/claude-sonnet-4.5",
  openRouterExtractModel: process.env.OPENROUTER_EXTRACT_MODEL ?? "openai/gpt-4o",
  openRouterImageModel: process.env.OPENROUTER_IMAGE_MODEL ?? "openai/gpt-image-1",
  openRouterVisionModel: process.env.OPENROUTER_VISION_MODEL ?? "openai/gpt-4o",
  openRouterEmbeddingModel: process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  openRouterEmbeddingDimensions: Number(process.env.OPENROUTER_EMBEDDING_DIMENSIONS ?? 1536),
  assetStorageDriver: process.env.ASSET_STORAGE_DRIVER ?? "local",
  localAssetRoot: process.env.LOCAL_ASSET_ROOT ?? "public/character-assets",
  publicAssetBaseUrl: process.env.PUBLIC_ASSET_BASE_URL ?? "/character-assets"
};
