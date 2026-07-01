"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, History, Loader2, Plus, RotateCcw, Save, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AiStatus, AppShell, SparkleAction } from "@/components/app-shell";
import { ContinuityContextPanel } from "@/components/continuity-context";
import { Button } from "@/components/ui";
import { WritingCanvas } from "@/components/writing-canvas";
import { apiFetch } from "@/lib/client-api";

type Scene = { id: string; title: string | null; draftText: string; approvedText: string | null; orderIndex?: number };
type Version = { id: string; sceneId: string | null; source: string; instruction: string | null; content: string; createdAt: string };

type ChapterBundle = {
  story: { id: string; title: string };
  chapter: { id: string; storyId: string; chapterNumber: number; title: string | null; approvedText: string | null; status: string };
  scenes: Scene[];
  draftVersions?: Version[];
  aiMessages: Array<{ id: string; role: string; content: string }>;
};

type StoryResponse = {
  story: { id: string; title: string };
  chapters: Array<{ id: string; chapterNumber: number; title: string | null; status: string; wordCount?: number }>;
};

type SaveStatus = "saved" | "saving" | "unsaved" | "failed";

export function WritingWorkspace({ initialMode = "draft" }: { initialMode?: "draft" | "cowriter" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chapterId, setChapterId] = useState(searchParams.get("chapterId"));
  const storyId = searchParams.get("storyId");
  const [bundle, setBundle] = useState<ChapterBundle | null>(null);
  const [storyChapters, setStoryChapters] = useState<StoryResponse["chapters"]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(chapterId || storyId));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | undefined>();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    async function resolveAndLoad() {
      setError(null);
      if (!chapterId && storyId) {
        const story = await apiFetch<StoryResponse>(`/api/stories/${storyId}`);
        setStoryChapters(story.chapters);
        const firstChapter = story.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)[0];
        if (firstChapter) {
          setChapterId(firstChapter.id);
          router.replace(`${initialMode === "cowriter" ? "/writing/co-writer" : "/writing"}?chapterId=${firstChapter.id}`);
          return;
        }
      }

      if (!chapterId) {
        setLoading(false);
        return;
      }

      await loadChapter(chapterId);
    }

    resolveAndLoad().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, [chapterId, storyId, initialMode, router]);

  async function loadChapter(nextChapterId: string) {
    setLoading(true);
    const data = await apiFetch<ChapterBundle>(`/api/chapters/${nextChapterId}`);
    setBundle(data);
    setActiveSceneId((current) => data.scenes.some((scene) => scene.id === current) ? current : data.scenes[0]?.id ?? null);
    setSaveStatus("saved");
    const story = await apiFetch<StoryResponse>(`/api/stories/${data.story.id}`);
    setStoryChapters(story.chapters);
    setLoading(false);
  }

  const sortedScenes = useMemo(() => [...(bundle?.scenes ?? [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)), [bundle?.scenes]);
  const activeScene = sortedScenes.find((scene) => scene.id === activeSceneId) ?? sortedScenes[0] ?? null;
  const displayedText = activeScene?.draftText ?? (bundle ? "" : undefined);
  const title = activeScene
    ? `${bundle?.chapter.title ?? `Chapter ${bundle?.chapter.chapterNumber}`} / ${activeScene.title ?? "Scene"}`
    : bundle
      ? `${bundle.chapter.title ?? `Chapter ${bundle.chapter.chapterNumber}`}`
      : initialMode === "cowriter"
        ? "Collaborative Draft: Chapter 4"
        : "Chapter 4: The Shattered Mirror";

  useEffect(() => {
    if (!activeScene || !chapterId || saveStatus !== "unsaved") {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await apiFetch(`/api/scenes/${activeScene.id}`, {
          method: "PATCH",
          body: JSON.stringify({ draftText: activeScene.draftText })
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("failed");
      }
    }, 950);

    return () => window.clearTimeout(timeout);
  }, [activeScene, chapterId, saveStatus]);

  function updateDraft(value: string) {
    if (!activeSceneId) return;
    setBundle((current) => current ? {
      ...current,
      scenes: current.scenes.map((scene) => scene.id === activeSceneId ? { ...scene, draftText: value } : scene)
    } : current);
    setSaveStatus("unsaved");
  }

  async function reloadCurrentChapter(message?: string) {
    if (!chapterId) return;
    await loadChapter(chapterId);
    if (message) setActionResult(message);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId || !activeSceneId) {
      setError("Create a live story and select a scene before generation.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const direction = String(form.get("direction") ?? "");
    setBusy("generate");
    setError(null);

    try {
      await apiFetch(`/api/chapters/${chapterId}/generate`, {
        method: "POST",
        body: JSON.stringify({ direction, sceneId: activeSceneId })
      });
      await reloadCurrentChapter("Draft generated and saved to the selected scene.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate draft");
    } finally {
      setBusy(null);
    }
  }

  async function revise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId || !activeSceneId) {
      setError("Create a live story and select a scene before revisions.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const command = String(form.get("command") ?? "");
    setBusy("revise");
    setError(null);

    try {
      await apiFetch(`/api/chapters/${chapterId}/revise`, {
        method: "POST",
        body: JSON.stringify({ command, sceneId: activeSceneId })
      });
      await reloadCurrentChapter("Revision applied and previous draft saved to version history.");
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

  async function createNextChapter() {
    if (!bundle) return;
    setBusy("chapter");
    setError(null);
    try {
      const result = await apiFetch<{ chapterId: string }>(`/api/stories/${bundle.story.id}/chapters`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setChapterId(result.chapterId);
      router.push(`/writing?chapterId=${result.chapterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create chapter");
    } finally {
      setBusy(null);
    }
  }

  async function createScene() {
    if (!chapterId) return;
    setBusy("scene");
    setError(null);
    try {
      const result = await apiFetch<{ scene: Scene }>(`/api/chapters/${chapterId}/scenes`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setBundle((current) => current ? { ...current, scenes: [...current.scenes, result.scene] } : current);
      setActiveSceneId(result.scene.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create scene");
    } finally {
      setBusy(null);
    }
  }

  async function saveVersion() {
    if (!activeScene) return;
    setBusy("snapshot");
    setError(null);
    try {
      await apiFetch(`/api/scenes/${activeScene.id}`, {
        method: "PATCH",
        body: JSON.stringify({ draftText: activeScene.draftText })
      });
      await apiFetch(`/api/chapters/${chapterId}/versions`, {
        method: "POST",
        body: JSON.stringify({ sceneId: activeScene.id, instruction: "Manual snapshot" })
      });
      await reloadCurrentChapter("Manual snapshot saved in draft history.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save version");
    } finally {
      setBusy(null);
    }
  }

  async function restoreVersion(versionId: string) {
    if (!chapterId) return;
    setBusy("restore");
    setError(null);
    try {
      const result = await apiFetch<{ restoredSceneId: string }>(`/api/chapters/${chapterId}/versions/${versionId}/restore`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setActiveSceneId(result.restoredSceneId);
      await reloadCurrentChapter("Version restored. Your previous active draft was saved first.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore version");
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
      status={busy === "generate" || busy === "revise" ? <AiStatus label={busy === "generate" ? "Generating..." : "Revising..."} /> : undefined}
      tabs={[
        { label: "Chapter", href: chapterId ? `/writing?chapterId=${chapterId}` : "/writing", active: initialMode === "draft" },
        { label: "Drafts", href: chapterId ? `/writing/co-writer?chapterId=${chapterId}` : "/writing/co-writer", active: initialMode === "cowriter" },
        { label: "Bible", href: bundle ? `/bible?storyId=${bundle.story.id}` : "/bible" }
      ]}
      action={action}
    >
      <div className="flex min-h-[calc(100vh-64px)] flex-col lg:flex-row">
        <div className="pointer-events-none fixed bottom-6 left-4 z-30 hidden flex-col gap-2 lg:left-[344px] lg:flex">
          <div className="pointer-events-auto" onClick={() => runAssistantAction("memory-check")}><SparkleAction label="Memory Check" /></div>
          <div className="pointer-events-auto" onClick={() => runAssistantAction("suggest-next-beat")}><SparkleAction label="Suggest Next Beat" /></div>
        </div>

        <aside className="order-2 w-full border-r border-outline-variant bg-surface-container-low p-4 lg:order-1 lg:w-80 lg:overflow-y-auto">
          <Navigator
            chapters={storyChapters}
            scenes={sortedScenes}
            currentChapterId={chapterId}
            activeSceneId={activeSceneId}
            onChapter={(id) => {
              setChapterId(id);
              router.push(`/writing?chapterId=${id}`);
            }}
            onScene={setActiveSceneId}
            onNewChapter={createNextChapter}
            onNewScene={createScene}
            busy={busy}
          />
        </aside>

        <div className="order-1 flex flex-1 flex-col lg:order-2">
          {error ? <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-800">{error}</div> : null}
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-on-surface-variant"><Loader2 className="animate-spin" size={20} />Loading chapter...</div>
          ) : (
            <WritingCanvas
              mode={initialMode}
              title={title}
              text={displayedText}
              editable={Boolean(bundle && activeScene)}
              onChange={updateDraft}
              saveStatus={saveStatus}
            />
          )}
          <div className="border-t border-outline-variant bg-white p-4 lg:hidden">
            <LiveControls busy={busy} generate={generate} revise={revise} coWriter={initialMode === "cowriter"} />
          </div>
        </div>

        <aside className="order-3 w-full border-l border-outline-variant bg-surface-container-low p-6 lg:w-96 lg:overflow-y-auto">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setHistoryOpen((open) => !open)} disabled={!bundle}><History size={16} />History</Button>
            <Button variant="secondary" onClick={saveVersion} disabled={!activeScene || Boolean(busy)}><Save size={16} />Save Version</Button>
          </div>
          {historyOpen && bundle ? <VersionDrawer versions={bundle.draftVersions ?? []} activeSceneId={activeSceneId} onRestore={restoreVersion} busy={busy} /> : null}
          <LiveControls busy={busy} generate={generate} revise={revise} coWriter={initialMode === "cowriter"} />
          <div className="mt-6">
            <ContinuityContextPanel coWriter={initialMode === "cowriter"} chapterId={chapterId ?? undefined} actionResult={actionResult} />
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

function Navigator({
  chapters,
  scenes,
  currentChapterId,
  activeSceneId,
  onChapter,
  onScene,
  onNewChapter,
  onNewScene,
  busy
}: {
  chapters: StoryResponse["chapters"];
  scenes: Scene[];
  currentChapterId: string | null;
  activeSceneId: string | null;
  onChapter: (id: string) => void;
  onScene: (id: string) => void;
  onNewChapter: () => void;
  onNewScene: () => void;
  busy: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="ui-label text-intelligence-teal">Chapters</p>
        <button type="button" onClick={onNewChapter} disabled={Boolean(busy)} className="rounded-md border border-outline-variant bg-white p-2 text-primary hover:bg-surface-container-low" aria-label="New chapter">
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            type="button"
            onClick={() => onChapter(chapter.id)}
            className={chapter.id === currentChapterId ? "w-full rounded-md border border-intelligence-teal bg-intelligence-glow p-3 text-left" : "w-full rounded-md border border-outline-variant bg-white p-3 text-left hover:bg-surface-container-low"}
          >
            <span className="block text-sm font-bold text-primary">Chapter {chapter.chapterNumber}: {chapter.title ?? "Untitled"}</span>
            <span className="mt-1 block text-xs font-bold uppercase text-on-surface-variant">{chapter.status} / {(chapter.wordCount ?? 0).toLocaleString()} words</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-5">
        <p className="ui-label text-intelligence-teal">Scenes</p>
        <button type="button" onClick={onNewScene} disabled={Boolean(busy) || !currentChapterId} className="rounded-md border border-outline-variant bg-white p-2 text-primary hover:bg-surface-container-low" aria-label="New scene">
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => onScene(scene.id)}
            className={scene.id === activeSceneId ? "w-full rounded-md border border-primary bg-white p-3 text-left shadow-sm" : "w-full rounded-md border border-outline-variant bg-white p-3 text-left hover:bg-surface-container-low"}
          >
            <span className="block text-sm font-bold text-primary">{scene.title ?? `Scene ${index + 1}`}</span>
            <span className="mt-1 block text-xs text-on-surface-variant">{scene.draftText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VersionDrawer({
  versions,
  activeSceneId,
  onRestore,
  busy
}: {
  versions: Version[];
  activeSceneId: string | null;
  onRestore: (versionId: string) => void;
  busy: string | null;
}) {
  const relevant = versions.filter((version) => !activeSceneId || version.sceneId === activeSceneId);

  return (
    <div className="mb-5 rounded-md border border-memory-border bg-white p-4">
      <p className="ui-label mb-3 text-intelligence-teal">Draft History</p>
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {relevant.length > 0 ? relevant.map((version) => (
          <div key={version.id} className="rounded-md border border-outline-variant p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-primary">{version.source}</p>
                <p className="text-xs text-on-surface-variant">{new Date(version.createdAt).toLocaleString()}</p>
              </div>
              <Button variant="secondary" onClick={() => onRestore(version.id)} disabled={Boolean(busy)}><RotateCcw size={14} />Restore</Button>
            </div>
            {version.instruction ? <p className="mb-2 text-xs font-bold text-on-surface-variant">{version.instruction}</p> : null}
            <p className="line-clamp-4 text-sm leading-6 text-on-surface-variant">{version.content.slice(0, 420)}</p>
          </div>
        )) : <p className="text-sm text-on-surface-variant">No versions for this scene yet.</p>}
      </div>
    </div>
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
