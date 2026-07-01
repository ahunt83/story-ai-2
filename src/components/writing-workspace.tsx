"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Brain, History, Layers, Loader2, Plus, RotateCcw, Save, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

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
type StreamUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
type StreamEvent =
  | { type: "context"; context: unknown }
  | { type: "delta"; content: string }
  | { type: "complete"; draft: string; context?: unknown; usage?: StreamUsage; generationId?: string; fallbackUsed?: boolean }
  | { type: "error"; error: string };
type RevisionPreviewState = {
  originalText: string;
  draft: string;
  command: string;
  complete: boolean;
  usage?: StreamUsage;
  generationId?: string;
  fallbackUsed?: boolean;
};

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
  const [mobileSheet, setMobileSheet] = useState<"navigator" | "ai" | "context" | "history" | null>(null);
  const [revisionPreview, setRevisionPreview] = useState<RevisionPreviewState | null>(null);

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
    setActiveSceneDraft(value);
    setSaveStatus("unsaved");
  }

  function setActiveSceneDraft(value: string) {
    if (!activeSceneId) return;
    setBundle((current) => current ? {
      ...current,
      scenes: current.scenes.map((scene) => scene.id === activeSceneId ? { ...scene, draftText: value } : scene)
    } : current);
  }

  async function reloadCurrentChapter(message?: string) {
    if (!chapterId) return;
    await loadChapter(chapterId);
    if (message) setActionResult(message);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId || !activeSceneId || !activeScene) {
      setError("Create a live story and select a scene before generation.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const direction = String(form.get("direction") ?? "");
    const originalText = activeScene.draftText;
    let streamedDraft = "";
    setBusy("generate");
    setSaveStatus("saving");
    setError(null);
    setRevisionPreview(null);

    try {
      await streamAiText(`/api/chapters/${chapterId}/generate`, { direction, sceneId: activeSceneId }, (streamEvent) => {
        if (streamEvent.type === "delta") {
          streamedDraft += streamEvent.content;
          setActiveSceneDraft(streamedDraft);
        }

        if (streamEvent.type === "complete") {
          setActiveSceneDraft(streamEvent.draft);
        }
      });
      await reloadCurrentChapter("Draft generated and saved to the selected scene.");
      formElement.reset();
    } catch (err) {
      setActiveSceneDraft(originalText);
      setSaveStatus("saved");
      setError(err instanceof Error ? err.message : "Could not generate draft");
    } finally {
      setBusy(null);
    }
  }

  async function revise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chapterId || !activeSceneId || !activeScene) {
      setError("Create a live story and select a scene before revisions.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const command = String(form.get("command") ?? "");
    const originalText = activeScene.draftText;
    let streamedDraft = "";
    setBusy("revise");
    setError(null);
    setRevisionPreview({ originalText, draft: "", command, complete: false });

    try {
      await streamAiText(`/api/chapters/${chapterId}/revise`, { command, sceneId: activeSceneId }, (streamEvent) => {
        if (streamEvent.type === "delta") {
          streamedDraft += streamEvent.content;
          setRevisionPreview((current) => current ? { ...current, draft: streamedDraft } : current);
        }

        if (streamEvent.type === "complete") {
          setRevisionPreview((current) => current ? {
            ...current,
            draft: streamEvent.draft,
            complete: true,
            usage: streamEvent.usage,
            generationId: streamEvent.generationId,
            fallbackUsed: streamEvent.fallbackUsed
          } : current);
        }
      });
      setActionResult("Revision preview ready. Accept or reject the changes.");
      formElement.reset();
    } catch (err) {
      setRevisionPreview(null);
      setActiveSceneDraft(originalText);
      setError(err instanceof Error ? err.message : "Could not revise draft");
    } finally {
      setBusy(null);
    }
  }

  async function acceptRevisionPreview() {
    if (!chapterId || !activeSceneId || !revisionPreview?.complete) return;

    setBusy("apply-revision");
    setError(null);

    try {
      await apiFetch(`/api/chapters/${chapterId}/apply-revision`, {
        method: "POST",
        body: JSON.stringify({
          sceneId: activeSceneId,
          command: revisionPreview.command,
          draft: revisionPreview.draft,
          usage: revisionPreview.usage,
          generationId: revisionPreview.generationId,
          fallbackUsed: revisionPreview.fallbackUsed
        })
      });
      setActiveSceneDraft(revisionPreview.draft);
      setRevisionPreview(null);
      await reloadCurrentChapter("Revision accepted and previous draft saved to version history.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept revision");
    } finally {
      setBusy(null);
    }
  }

  function rejectRevisionPreview() {
    setRevisionPreview(null);
    setActionResult("Revision rejected. Original draft kept.");
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
    ? <Link href={`/writing/extraction?chapterId=${chapterId}`} className="hidden rounded-md bg-intelligence-teal px-4 py-2 text-sm font-bold text-on-primary transition hover:brightness-105 sm:inline-flex">Extract Memory</Link>
    : <Link href="/" className="hidden rounded-md bg-intelligence-teal px-4 py-2 text-sm font-bold text-on-primary transition hover:brightness-105 sm:inline-flex">Create Story</Link>;
  const draftLocked = busy === "generate" || busy === "revise" || busy === "apply-revision" || Boolean(revisionPreview);
  const hasLiveChapter = Boolean(bundle && chapterId);

  return (
    <AppShell
      title={bundle ? `Chapter ${bundle.chapter.chapterNumber}` : "Chapter 4"}
      activeTab={initialMode === "cowriter" ? "Drafts" : "Outline"}
      status={busy === "generate" || busy === "revise" ? <AiStatus label={busy === "generate" ? "Generating..." : "Revising..."} /> : undefined}
      tabs={[
        { label: "Foundation", href: bundle ? `/foundation?storyId=${bundle.story.id}` : "/foundation" },
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

        <aside className="hidden border-r border-outline-variant bg-surface-container-low p-4 lg:order-1 lg:block lg:w-80 lg:overflow-y-auto">
          <Navigator
            chapters={storyChapters}
            scenes={sortedScenes}
            currentChapterId={chapterId}
            activeSceneId={activeSceneId}
            onChapter={(id) => {
              setRevisionPreview(null);
              setChapterId(id);
              router.push(`/writing?chapterId=${id}`);
            }}
            onScene={(id) => {
              setRevisionPreview(null);
              setActiveSceneId(id);
            }}
            onNewChapter={createNextChapter}
            onNewScene={createScene}
            busy={busy}
          />
        </aside>

        <div className="order-1 flex flex-1 flex-col lg:order-2">
          {error ? <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-800">{error}</div> : null}
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-on-surface-variant"><Loader2 className="animate-spin" size={20} />Loading chapter...</div>
          ) : !hasLiveChapter ? (
            <EmptyWritingState />
          ) : (
            <WritingCanvas
              mode={initialMode}
              title={title}
              text={revisionPreview ? revisionPreview.draft : displayedText}
              editable={Boolean(bundle && activeScene) && !draftLocked}
              onChange={updateDraft}
              saveStatus={busy === "generate" ? "saving" : saveStatus}
              revisionPreview={revisionPreview ? {
                streaming: !revisionPreview.complete || busy === "revise",
                applying: busy === "apply-revision",
                onAccept: acceptRevisionPreview,
                onReject: rejectRevisionPreview
              } : undefined}
            />
          )}
        </div>

        <aside className="hidden border-l border-outline-variant bg-surface-container-low p-6 lg:order-3 lg:block lg:w-96 lg:overflow-y-auto">
          <HistoryTools
            open={historyOpen}
            onToggle={() => setHistoryOpen((open) => !open)}
            onSave={saveVersion}
            versions={bundle?.draftVersions ?? []}
            activeSceneId={activeSceneId}
            onRestore={restoreVersion}
            busy={busy}
            canSave={Boolean(activeScene)}
            hasBundle={Boolean(bundle)}
          />
          <LiveControls busy={busy} generate={generate} revise={revise} coWriter={initialMode === "cowriter"} />
          <div className="mt-6">
            <ContinuityContextPanel coWriter={initialMode === "cowriter"} chapterId={chapterId ?? undefined} actionResult={actionResult} />
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 gap-2 rounded-md border border-outline-variant bg-white/95 p-2 shadow-lg backdrop-blur lg:hidden">
        <Button variant="secondary" className="px-2 text-xs" onClick={() => setMobileSheet("navigator")} disabled={!hasLiveChapter}><Layers size={16} />Story</Button>
        <Button variant="secondary" className="px-2 text-xs" onClick={() => setMobileSheet("history")} disabled={!hasLiveChapter}><History size={16} />History</Button>
        <Button variant="secondary" className="px-2 text-xs" onClick={() => setMobileSheet("context")} disabled={!hasLiveChapter}><Brain size={16} />Context</Button>
        <Button variant="teal" className="px-2 text-xs" onClick={() => setMobileSheet("ai")} disabled={!hasLiveChapter}><WandSparkles size={16} />AI</Button>
      </div>

      <MobileSheet title="Story Structure" open={mobileSheet === "navigator"} onClose={() => setMobileSheet(null)}>
        <Navigator
          chapters={storyChapters}
          scenes={sortedScenes}
          currentChapterId={chapterId}
          activeSceneId={activeSceneId}
          onChapter={(id) => {
            setRevisionPreview(null);
            setChapterId(id);
            setMobileSheet(null);
            router.push(`/writing?chapterId=${id}`);
          }}
          onScene={(id) => {
            setRevisionPreview(null);
            setActiveSceneId(id);
            setMobileSheet(null);
          }}
          onNewChapter={createNextChapter}
          onNewScene={createScene}
          busy={busy}
        />
      </MobileSheet>

      <MobileSheet title="AI Controls" open={mobileSheet === "ai"} onClose={() => setMobileSheet(null)}>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => runAssistantAction("memory-check")} disabled={Boolean(busy)}><Brain size={16} />Memory Check</Button>
          <Button variant="secondary" onClick={() => runAssistantAction("suggest-next-beat")} disabled={Boolean(busy)}><WandSparkles size={16} />Suggest Next Beat</Button>
        </div>
        <LiveControls busy={busy} generate={generate} revise={revise} coWriter={initialMode === "cowriter"} />
        {chapterId ? (
          <Link href={`/writing/extraction?chapterId=${chapterId}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-intelligence-teal px-4 py-3 text-sm font-bold text-on-primary transition hover:brightness-105">
            <BookOpen size={16} />
            Extract Memory
          </Link>
        ) : null}
      </MobileSheet>

      <MobileSheet title="Continuity Context" open={mobileSheet === "context"} onClose={() => setMobileSheet(null)}>
        <ContinuityContextPanel coWriter={initialMode === "cowriter"} chapterId={chapterId ?? undefined} actionResult={actionResult} />
      </MobileSheet>

      <MobileSheet title="Draft History" open={mobileSheet === "history"} onClose={() => setMobileSheet(null)}>
        <HistoryTools
          open
          onToggle={() => setHistoryOpen(true)}
          onSave={saveVersion}
          versions={bundle?.draftVersions ?? []}
          activeSceneId={activeSceneId}
          onRestore={restoreVersion}
          busy={busy}
          canSave={Boolean(activeScene)}
          hasBundle={Boolean(bundle)}
        />
      </MobileSheet>
    </AppShell>
  );
}

function EmptyWritingState() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-16">
      <section className="w-full max-w-xl rounded-md border border-dashed border-outline-variant bg-white p-6 text-center">
        <p className="ui-label mb-3 text-intelligence-teal">No Chapter Selected</p>
        <h2 className="headline-serif text-3xl text-primary">Open a live manuscript</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
          Choose a story from the library or start a new one before using the editor, generation tools, and memory workflow.
        </p>
        <Link href="/" className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-intelligence-teal px-4 py-2 text-sm font-bold text-on-primary transition hover:brightness-105">
          <BookOpen size={16} />
          Go to Library
        </Link>
      </section>
    </div>
  );
}

function HistoryTools({
  open,
  onToggle,
  onSave,
  versions,
  activeSceneId,
  onRestore,
  busy,
  canSave,
  hasBundle
}: {
  open: boolean;
  onToggle: () => void;
  onSave: () => void;
  versions: Version[];
  activeSceneId: string | null;
  onRestore: (versionId: string) => void;
  busy: string | null;
  canSave: boolean;
  hasBundle: boolean;
}) {
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onToggle} disabled={!hasBundle}><History size={16} />History</Button>
        <Button variant="secondary" onClick={onSave} disabled={!canSave || Boolean(busy)}><Save size={16} />Save Version</Button>
      </div>
      {open && hasBundle ? <VersionDrawer versions={versions} activeSceneId={activeSceneId} onRestore={onRestore} busy={busy} /> : null}
    </>
  );
}

function MobileSheet({
  title,
  open,
  onClose,
  children
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/35 lg:hidden" role="dialog" aria-modal="true" aria-labelledby={`mobile-sheet-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex h-full flex-col bg-surface-container-lowest">
        <header className="flex items-center justify-between border-b border-outline-variant bg-white px-4 py-3">
          <h2 id={`mobile-sheet-${title.replace(/\s+/g, "-").toLowerCase()}`} className="headline-serif text-2xl text-primary">{title}</h2>
          <button type="button" className="rounded-md p-2 text-on-surface-variant hover:bg-surface-container-low" onClick={onClose} aria-label={`Close ${title}`}>
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 pb-28">
          {children}
        </div>
      </div>
    </div>
  );
}

async function streamAiText(url: string, body: Record<string, unknown>, onEvent: (event: StreamEvent) => void) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/x-ndjson",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }

  if (!response.body) {
    throw new Error("The AI stream could not be opened.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let lineBreak = buffer.indexOf("\n");

    while (lineBreak >= 0) {
      const line = buffer.slice(0, lineBreak).trim();
      buffer = buffer.slice(lineBreak + 1);
      if (line) handleStreamLine(line, onEvent);
      lineBreak = buffer.indexOf("\n");
    }
  }

  const finalLine = buffer.trim();
  if (finalLine) {
    handleStreamLine(finalLine, onEvent);
  }
}

function handleStreamLine(line: string, onEvent: (event: StreamEvent) => void) {
  const event = JSON.parse(line) as StreamEvent;
  if (event.type === "error") {
    throw new Error(event.error);
  }
  onEvent(event);
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
