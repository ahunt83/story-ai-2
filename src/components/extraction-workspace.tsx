"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Edit3, FileText, Loader2, PersonStanding, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button, ImportancePill, MemoryCard, SectionHeading } from "@/components/ui";
import { WritingCanvas } from "@/components/writing-canvas";
import { apiFetch } from "@/lib/client-api";
import { sampleMemory } from "@/lib/sample-data";
import type { ChapterMemory } from "@/lib/story-memory/schema";

type ChapterBundle = {
  story: { id: string; title: string };
  chapter: { id: string; storyId: string; chapterNumber: number; title: string | null; approvedText: string | null; status: string };
  scenes: Array<{ id: string; title: string | null; draftText: string; approvedText: string | null }>;
  latestMemory?: { id: string; memory: ChapterMemory; approvedForBible: boolean } | null;
};

export function ExtractionWorkspace() {
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapterId");
  const [bundle, setBundle] = useState<ChapterBundle | null>(null);
  const [memory, setMemory] = useState<ChapterMemory>(sampleMemory);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) {
      return;
    }

    apiFetch<ChapterBundle>(`/api/chapters/${chapterId}`)
      .then((data) => {
        setBundle(data);
        if (data.latestMemory?.memory) {
          setMemory(data.latestMemory.memory);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [chapterId]);

  const chapterText = useMemo(() => {
    if (!bundle) {
      return undefined;
    }

    return bundle.chapter.approvedText ?? bundle.scenes.map((scene) => scene.approvedText ?? scene.draftText).filter(Boolean).join("\n\n");
  }, [bundle]);

  const title = bundle?.chapter.title ?? `Chapter ${bundle?.chapter.chapterNumber ?? 4}: ${memory.chapterMetadata.title ?? "The Shattered Mirror"}`;

  async function extract() {
    if (!chapterId) {
      setError("Create or open a live chapter before extracting memory.");
      return;
    }

    setBusy("extract");
    setError(null);
    setNotice(null);

    try {
      const result = await apiFetch<{ memoryId: string; memory: ChapterMemory; repaired: boolean }>(`/api/chapters/${chapterId}/extract-memory`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setMemory(result.memory);
      setNotice(result.repaired ? "Memory extracted after repair and is ready for review." : "Memory extracted and ready for review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not extract memory");
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    if (!chapterId) {
      setError("Create or open a live chapter before committing memory.");
      return;
    }

    setBusy("commit");
    setError(null);
    setNotice(null);

    try {
      const result = await apiFetch<{ memoryItems: number; storyBible: unknown }>(`/api/chapters/${chapterId}/commit-memory`, {
        method: "POST",
        body: JSON.stringify({ memory })
      });
      setNotice(`Committed to Story Bible with ${result.memoryItems} searchable memory items.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not commit memory");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell
      title={title}
      activeTab="Extraction"
      tabs={[
        { label: "Drafts", href: chapterId ? `/writing/co-writer?chapterId=${chapterId}` : "/writing/co-writer" },
        { label: "Extraction", href: chapterId ? `/writing/extraction?chapterId=${chapterId}` : "/writing/extraction", active: true },
        { label: "Outline", href: chapterId ? `/writing?chapterId=${chapterId}` : "/writing" }
      ]}
      action={<Button variant="primary" onClick={commit} disabled={Boolean(busy)}><Sparkles size={17} />{busy === "commit" ? "Committing..." : "Commit to Story Bible"}</Button>}
    >
      <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden lg:flex-row">
        <WritingCanvas mode="readonly" title={title} text={chapterText} />
        <aside className="w-full overflow-y-auto border-l border-outline-variant/40 bg-surface-container-lowest lg:w-[480px]">
          <div className="sticky top-0 z-10 border-b border-outline-variant/30 bg-white/95 p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="ui-label flex items-center gap-2 text-intelligence-teal"><Sparkles size={17} />Continuity Extraction</h2>
              <span className="rounded-full bg-intelligence-glow px-3 py-1 text-xs font-bold text-intelligence-teal">{busy ? "AI Active" : "Ready"}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-container">
              <div className="h-full w-full bg-intelligence-teal" />
            </div>
            <p className="mt-4 text-sm leading-6 text-on-surface-variant">Review extracted facts before committing them to durable story memory.</p>
            <div className="mt-4 flex gap-3">
              <Button variant="teal" onClick={extract} disabled={Boolean(busy)}>
                {busy === "extract" ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
                {busy === "extract" ? "Extracting..." : "Run Extraction"}
              </Button>
              <Link href={chapterId ? `/writing?chapterId=${chapterId}` : "/writing"} className="inline-flex items-center rounded-md border border-outline-variant bg-white px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container-low">Back to Writing</Link>
            </div>
            {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
            {notice ? <p className="mt-3 text-sm font-bold text-intelligence-teal">{notice}</p> : null}
          </div>

          <div className="space-y-6 p-6">
            <section>
              <SectionHeading icon={<FileText size={16} />} title="Chapter Summaries" />
              <SummaryCard label="Short" content={memory.summaries.shortSummary} active />
              <SummaryCard label="Medium" content={memory.summaries.mediumSummary} />
              <SummaryCard label="Long" content={memory.summaries.longSummary} />
            </section>

            <section>
              <SectionHeading icon={<PersonStanding size={16} />} title="Character States" />
              <div className="space-y-3">
                {memory.characterStates.length > 0 ? memory.characterStates.map((character) => (
                  <MemoryCard key={character.name} title={character.name} importance={character.importance} meta={character.evidenceOrBasis}>
                    <p>{character.emotionalState ?? character.statusAtChapterEnd}</p>
                    <p className="mt-2">{character.continuityNotes.join(" ")}</p>
                  </MemoryCard>
                )) : <EmptyMemory label="No character states extracted yet." />}
              </div>
            </section>

            <section>
              <SectionHeading title="New Canon Facts" />
              <div className="space-y-3">
                {memory.canonFactsEstablished.map((fact) => (
                  <MemoryCard key={fact.fact} title={fact.category} importance={fact.importance} meta={fact.evidenceOrBasis}>
                    {fact.fact}
                  </MemoryCard>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading title="Continuity Warnings" />
              <div className="space-y-3">
                {memory.continuityWarnings.length > 0 ? memory.continuityWarnings.map((warning) => (
                  <MemoryCard key={warning.warning} title={warning.warning} importance={warning.importance} meta={warning.evidenceOrBasis}>
                    <p>{warning.possibleContradiction}</p>
                    <p className="mt-2">{warning.suggestedHandling}</p>
                  </MemoryCard>
                )) : <EmptyMemory label="No continuity warnings extracted." />}
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 grid grid-cols-3 gap-3 border-t border-outline-variant/30 bg-white p-4">
            <Button variant="secondary" className="col-span-1" onClick={extract} disabled={Boolean(busy)}>Refresh</Button>
            <Button variant="primary" className="col-span-2" onClick={commit} disabled={Boolean(busy)}><Check size={18} />{busy === "commit" ? "Committing..." : "Commit to Story Bible"}</Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function SummaryCard({ label, content, active = false }: { label: string; content: string; active?: boolean }) {
  return (
    <div className="mb-3 rounded-md border border-memory-border bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={active ? "rounded bg-intelligence-glow px-2 py-0.5 text-xs font-bold text-intelligence-teal" : "rounded bg-surface-container px-2 py-0.5 text-xs font-bold text-on-surface-variant"}>{label}</span>
        <div className="flex items-center gap-3">
          <Edit3 size={17} className="text-on-surface-variant" />
          <ImportancePill importance={active ? "critical" : "major"} />
        </div>
      </div>
      <p className="text-sm leading-6 text-on-surface-variant">{content}</p>
    </div>
  );
}

function EmptyMemory({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{label}</div>;
}
