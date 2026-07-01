"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Brain, Loader2, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AiStatus, AppShell, SparkleAction } from "@/components/app-shell";
import { ContinuityContextPanel } from "@/components/continuity-context";
import { Button } from "@/components/ui";
import { WritingCanvas } from "@/components/writing-canvas";
import { apiFetch } from "@/lib/client-api";
import { sampleChapterText } from "@/lib/sample-data";

type ChapterBundle = {
  story: { id: string; title: string };
  chapter: { id: string; storyId: string; chapterNumber: number; title: string | null; approvedText: string | null; status: string };
  scenes: Array<{ id: string; title: string | null; draftText: string; approvedText: string | null }>;
  aiMessages: Array<{ id: string; role: string; content: string }>;
};

type StoryResponse = {
  story: { id: string; title: string };
  chapters: Array<{ id: string; chapterNumber: number }>;
};

export function WritingWorkspace({ initialMode = "draft" }: { initialMode?: "draft" | "cowriter" }) {
  const searchParams = useSearchParams();
  const [chapterId, setChapterId] = useState(searchParams.get("chapterId"));
  const storyId = searchParams.get("storyId");
  const [bundle, setBundle] = useState<ChapterBundle | null>(null);
  const [loading, setLoading] = useState(Boolean(chapterId || storyId));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | undefined>();

  useEffect(() => {
    async function resolveAndLoad() {
      if (!chapterId && storyId) {
        const story = await apiFetch<StoryResponse>(`/api/stories/${storyId}`);
        const firstChapter = story.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)[0];
        if (firstChapter) {
          setChapterId(firstChapter.id);
          return;
        }
      }

      if (!chapterId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await apiFetch<ChapterBundle>(`/api/chapters/${chapterId}`);
        setBundle(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load chapter");
      } finally {
        setLoading(false);
      }
    }

    resolveAndLoad();
  }, [chapterId, storyId]);

  const draftText = useMemo(() => {
    if (!bundle) {
      return sampleChapterText;
    }

    return bundle.scenes.map((scene) => scene.approvedText ?? scene.draftText).filter(Boolean).join("\n\n");
  }, [bundle]);

  const title = bundle
    ? `${bundle.chapter.title ?? `Chapter ${bundle.chapter.chapterNumber}`}`
    : initialMode === "cowriter"
      ? "Collaborative Draft: Chapter 4"
      : "Chapter 4: The Shattered Mirror";

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId) {
      setError("Create a live story first, then generation will write into its chapter.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const direction = String(form.get("direction") ?? "");
    setBusy("generate");
    setError(null);

    try {
      await apiFetch(`/api/chapters/${chapterId}/generate`, {
        method: "POST",
        body: JSON.stringify({ direction })
      });
      const data = await apiFetch<ChapterBundle>(`/api/chapters/${chapterId}`);
      setBundle(data);
      setActionResult("Draft generated and saved to the active scene.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate draft");
    } finally {
      setBusy(null);
    }
  }

  async function revise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId) {
      setError("Create a live story first, then revisions will update the active draft.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const command = String(form.get("command") ?? "");
    setBusy("revise");
    setError(null);

    try {
      await apiFetch(`/api/chapters/${chapterId}/revise`, {
        method: "POST",
        body: JSON.stringify({ command })
      });
      const data = await apiFetch<ChapterBundle>(`/api/chapters/${chapterId}`);
      setBundle(data);
      setActionResult("Revision applied and previous draft saved to version history.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revise draft");
    } finally {
      setBusy(null);
    }
  }

  async function runAssistantAction(kind: "memory-check" | "suggest-next-beat") {
    if (!chapterId) {
      setError("Create a live story first to use AI context tools.");
      return;
    }

    setBusy(kind);
    setError(null);

    try {
      const result = await apiFetch<{ result: string }>(`/api/chapters/${chapterId}/${kind}`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setActionResult(result.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant action failed");
    } finally {
      setBusy(null);
    }
  }

  const action = chapterId
    ? <Link href={`/writing/extraction?chapterId=${chapterId}`} className="hidden rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:opacity-90 sm:inline-flex">Extract Memory</Link>
    : <Link href="/" className="hidden rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:opacity-90 sm:inline-flex">Create Story</Link>;

  return (
    <AppShell
      title={bundle ? `Chapter ${bundle.chapter.chapterNumber}` : "Chapter 4"}
      activeTab={initialMode === "cowriter" ? "Drafts" : "Outline"}
      status={initialMode === "cowriter" || busy === "generate" ? <AiStatus label={busy ? "AI Working..." : "AI Drafting..."} /> : undefined}
      tabs={[
        { label: "Chapter", href: chapterId ? `/writing?chapterId=${chapterId}` : "/writing", active: initialMode === "draft" },
        { label: "Drafts", href: chapterId ? `/writing/co-writer?chapterId=${chapterId}` : "/writing/co-writer", active: initialMode === "cowriter" },
        { label: "Outline", href: chapterId ? `/writing?chapterId=${chapterId}` : "/writing" }
      ]}
      action={action}
    >
      <div className="flex min-h-[calc(100vh-64px)] flex-col lg:flex-row">
        <div className="pointer-events-none fixed bottom-6 left-4 z-30 hidden flex-col gap-2 lg:left-[344px] lg:flex">
          <div className="pointer-events-auto" onClick={() => runAssistantAction("memory-check")}><SparkleAction label="Memory Check" /></div>
          <div className="pointer-events-auto" onClick={() => runAssistantAction("suggest-next-beat")}><SparkleAction label="Suggest Next Beat" /></div>
        </div>

        <div className="flex flex-1 flex-col">
          {error ? <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-800">{error}</div> : null}
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-on-surface-variant"><Loader2 className="animate-spin" size={20} />Loading chapter...</div>
          ) : (
            <WritingCanvas mode={initialMode} title={title} text={bundle ? draftText : undefined} />
          )}
          <div className="border-t border-outline-variant bg-white p-4 lg:hidden">
            <LiveControls busy={busy} generate={generate} revise={revise} coWriter={initialMode === "cowriter"} />
          </div>
        </div>

        <aside className="w-full border-l border-outline-variant bg-surface-container-low p-6 lg:w-96 lg:overflow-y-auto">
          <LiveControls busy={busy} generate={generate} revise={revise} coWriter={initialMode === "cowriter"} />
          <div className="mt-6">
            <ContinuityContextPanel coWriter={initialMode === "cowriter"} actionResult={actionResult} />
          </div>
        </aside>
      </div>
      <div className="fixed bottom-4 right-4 z-30 flex gap-2 lg:hidden">
        <Button variant="secondary" onClick={() => runAssistantAction("memory-check")}><Brain size={16} />Context</Button>
        <Button variant="teal" onClick={() => runAssistantAction("suggest-next-beat")}><WandSparkles size={16} />AI</Button>
      </div>
    </AppShell>
  );
}

function LiveControls({
  busy,
  generate,
  revise,
  coWriter
}: {
  busy: string | null;
  generate: (event: FormEvent<HTMLFormElement>) => void;
  revise: (event: FormEvent<HTMLFormElement>) => void;
  coWriter: boolean;
}) {
  return (
    <div className="space-y-4">
      <form onSubmit={generate} className="rounded-md border border-memory-border bg-white p-4">
        <p className="ui-label mb-3 text-intelligence-teal">Generate</p>
        <textarea name="direction" required rows={4} className="mb-3 w-full rounded-md border border-outline-variant px-3 py-2 text-sm outline-none focus:border-intelligence-teal" placeholder="Write the next scene. Focus on the mirror contradiction and keep the mood atmospheric." />
        <Button variant="teal" className="w-full" disabled={Boolean(busy)}>{busy === "generate" ? "Generating..." : "Generate Draft"}</Button>
      </form>

      {coWriter ? (
        <form onSubmit={revise} className="rounded-md border border-memory-border bg-white p-4">
          <p className="ui-label mb-3 text-intelligence-teal">Revise</p>
          <textarea name="command" required rows={3} className="mb-3 w-full rounded-md border border-outline-variant px-3 py-2 text-sm outline-none focus:border-intelligence-teal" placeholder="Make the last paragraph more tense and clarify Elena's voice." />
          <Button variant="primary" className="w-full" disabled={Boolean(busy)}>{busy === "revise" ? "Revising..." : "Apply Revision"}</Button>
        </form>
      ) : null}
    </div>
  );
}
