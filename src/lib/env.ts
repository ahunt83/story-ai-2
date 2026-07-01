export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://story_ai:story_ai@localhost:5432/story_ai",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterChatModel: process.env.OPENROUTER_CHAT_MODEL ?? "anthropic/claude-sonnet-4.5",
  openRouterExtractModel: process.env.OPENROUTER_EXTRACT_MODEL ?? "openai/gpt-4o",
  openRouterEmbeddingModel: process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  openRouterEmbeddingDimensions: Number(process.env.OPENROUTER_EMBEDDING_DIMENSIONS ?? 1536)
};
