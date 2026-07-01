import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { aiMessages, draftVersions, scenes } from "@/db/schema";
import { startAiRun } from "@/lib/ai-runs";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { createId } from "@/lib/ids";
import { OpenRouterRequestError, OpenRouterStreamError, type OpenRouterUsage } from "@/lib/openrouter";
import { NotFoundError } from "@/lib/ownership";
import { generateDraftRun, streamGenerateDraftRun } from "@/lib/story-memory/ai";
import { buildContextForChapter } from "@/lib/story-memory/context";
import { createMockContext } from "@/lib/story-memory/mock";
import { resolveStoryModelSettings } from "@/lib/story-settings";
import { loadChapterBundle } from "../helpers";

const generateSchema = z.object({
  direction: z.string().min(1),
  sceneId: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ chapterId: string }> }) {
  try {
    const user = await requireUser();
    const { chapterId } = await context.params;
    const input = generateSchema.parse(await request.json());
    const bundle = await loadChapterBundle(chapterId, user.id);
    const targetScene = input.sceneId
      ? bundle.scenes.find((scene) => scene.id === input.sceneId)
      : bundle.scenes[0];

    if (!targetScene) {
      throw new NotFoundError("Scene not found");
    }

    const modelSettings = await resolveStoryModelSettings(bundle.story.id);
    const chapterContext = await buildContextForChapter({
      storyId: bundle.story.id,
      targetChapterNumber: bundle.chapter.chapterNumber,
      query: input.direction,
      embeddingModel: modelSettings.embeddingModel
    }).catch(() => createMockContext());

    if (wantsStreaming(request)) {
      const encoder = new TextEncoder();
      const aiRun = await startAiRun({
        userId: user.id,
        storyId: bundle.story.id,
        chapterId,
        sceneId: targetScene.id,
        operation: "generate",
        model: modelSettings.chatModel
      });

      return new Response(new ReadableStream({
        async start(controller) {
          let draft = "";
          let usage: OpenRouterUsage | undefined;
          let generationId: string | undefined;

          try {
            controller.enqueue(jsonLine(encoder, { type: "context", context: chapterContext }));

            for await (const event of streamGenerateDraftRun({
              storyTitle: bundle.story.title,
              direction: input.direction,
              context: chapterContext,
              modelSettings,
              signal: request.signal
            })) {
              if (event.type === "delta") {
                draft += event.content;
                controller.enqueue(jsonLine(encoder, { type: "delta", content: event.content }));
              } else if (event.type === "usage") {
                usage = event.usage;
              } else if (event.type === "metadata") {
                generationId = event.generationId;
              }
            }

            if (!draft.trim()) {
              throw new Error("OpenRouter returned an empty draft.");
            }

            await db.transaction(async (tx) => {
              if (targetScene.draftText) {
                await tx.insert(draftVersions).values({
                  id: createId("version"),
                  sceneId: targetScene.id,
                  chapterId,
                  source: "generate",
                  instruction: input.direction,
                  content: targetScene.draftText
                });
              }

              await tx.update(scenes).set({ draftText: draft, updatedAt: new Date() }).where(eq(scenes.id, targetScene.id));
              await tx.insert(aiMessages).values([
                { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "user", content: input.direction },
                { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "assistant", content: draft, metadata: { kind: "generate", usage, fallbackUsed: !env.openRouterApiKey, generationId } }
              ]);
            });

            await aiRun.succeed({ usage, fallbackUsed: !env.openRouterApiKey, generationId });
            controller.enqueue(jsonLine(encoder, { type: "complete", draft, context: chapterContext }));
          } catch (error) {
            await aiRun.fail(error, { fallbackUsed: !env.openRouterApiKey, generationId });
            await storeStreamFailure({
              storyId: bundle.story.id,
              chapterId,
              kind: "generate",
              error,
              generationId,
              partialLength: draft.length
            });
            controller.enqueue(jsonLine(encoder, { type: "error", error: errorMessage(error) }));
          } finally {
            controller.close();
          }
        }
      }), {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform"
        }
      });
    }

    let run: Awaited<ReturnType<typeof generateDraftRun>>;
    const aiRun = await startAiRun({
      userId: user.id,
      storyId: bundle.story.id,
      chapterId,
      sceneId: targetScene.id,
      operation: "generate",
      model: modelSettings.chatModel
    });
    try {
      run = await generateDraftRun({
        storyTitle: bundle.story.title,
        direction: input.direction,
        context: chapterContext,
        modelSettings
      });
    } catch (error) {
      await aiRun.fail(error, { fallbackUsed: !env.openRouterApiKey });
      await db.insert(aiMessages).values({
        id: createId("msg"),
        storyId: bundle.story.id,
        chapterId,
        role: "assistant",
        content: error instanceof Error ? error.message : "Generation failed",
        metadata: {
          status: "failed",
          kind: "generate",
          providerStatus: error instanceof OpenRouterRequestError ? error.status : undefined
        }
      });
      throw error;
    }

    const draft = run.content;

    await db.transaction(async (tx) => {
      if (targetScene.draftText) {
        await tx.insert(draftVersions).values({
          id: createId("version"),
          sceneId: targetScene.id,
          chapterId,
          source: "generate",
          instruction: input.direction,
          content: targetScene.draftText
        });
      }

      await tx.update(scenes).set({ draftText: draft, updatedAt: new Date() }).where(eq(scenes.id, targetScene.id));
      await tx.insert(aiMessages).values([
        { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "user", content: input.direction },
        { id: createId("msg"), storyId: bundle.story.id, chapterId, role: "assistant", content: draft, metadata: { kind: "generate", usage: run.usage, fallbackUsed: run.fallbackUsed } }
      ]);
    });

    await aiRun.succeed({ usage: run.usage, fallbackUsed: run.fallbackUsed });
    return ok({ draft, context: chapterContext });
  } catch (error) {
    return fail(error);
  }
}

function wantsStreaming(request: Request) {
  return request.headers.get("Accept")?.includes("application/x-ndjson");
}

function jsonLine(encoder: TextEncoder, value: Record<string, unknown>) {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

async function storeStreamFailure(params: {
  storyId: string;
  chapterId: string;
  kind: "generate";
  error: unknown;
  generationId?: string;
  partialLength: number;
}) {
  await db.insert(aiMessages).values({
    id: createId("msg"),
    storyId: params.storyId,
    chapterId: params.chapterId,
    role: "assistant",
    content: errorMessage(params.error),
    metadata: {
      status: "failed",
      kind: params.kind,
      providerStatus: params.error instanceof OpenRouterRequestError ? params.error.status : undefined,
      providerCode: params.error instanceof OpenRouterStreamError ? params.error.code : undefined,
      generationId: params.generationId,
      partialLength: params.partialLength
    }
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Generation failed";
}
