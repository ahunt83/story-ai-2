"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Edit3, FileText, Loader2, PersonStanding, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button, ImportancePill, SectionHeading } from "@/components/ui";
import { WritingCanvas } from "@/components/writing-canvas";
import { apiFetch } from "@/lib/client-api";
import { sampleMemory } from "@/lib/sample-data";
import { approvedMemory, importanceOptions, isIncluded, persistenceOptions, type ReviewInclusions, type ReviewableSection } from "@/lib/story-memory/approval";
import { chapterMemorySchema, type ChapterMemory, type Importance, type Persistence } from "@/lib/story-memory/schema";

type ChapterBundle = {
  story: { id: string; title: string };
  chapter: { id: string; storyId: string; chapterNumber: number; title: string | null; approvedText: string | null; status: string };
  scenes: Array<{ id: string; title: string | null; draftText: string; approvedText: string | null }>;
  latestMemory?: { id: string; memory: ChapterMemory; approvedForBible: boolean } | null;
};

export function ExtractionWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapterId");
  const [bundle, setBundle] = useState<ChapterBundle | null>(null);
  const [memory, setMemory] = useState<ChapterMemory>(sampleMemory);
  const [inclusions, setInclusions] = useState<ReviewInclusions>({});
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
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
      setInclusions({});
      setValidationIssues([]);
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
    setValidationIssues([]);

    try {
      const memoryToCommit = approvedMemory(memory, inclusions);
      const parsed = chapterMemorySchema.safeParse(memoryToCommit);
      if (!parsed.success) {
        setValidationIssues(parsed.error.issues.map((issue) => `${issue.path.join(".") || "memory"}: ${issue.message}`));
        setBusy(null);
        return;
      }

      const result = await apiFetch<{ memoryItems: number; storyBible: unknown }>(`/api/chapters/${chapterId}/commit-memory`, {
        method: "POST",
        body: JSON.stringify({ memory: parsed.data })
      });
      setNotice(`Committed to Story Bible with ${result.memoryItems} searchable memory items.`);
      if (bundle?.story.id) {
        router.push(`/bible?storyId=${bundle.story.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not commit memory");
    } finally {
      setBusy(null);
    }
  }

  function toggle(section: ReviewableSection, index: number) {
    setInclusions((current) => ({
      ...current,
      [`${section}:${index}`]: !isIncluded(current, section, index)
    }));
  }

  function updateSummary(key: keyof ChapterMemory["summaries"], value: string) {
    setMemory((current) => ({ ...current, summaries: { ...current.summaries, [key]: value } }));
  }

  function updateArrayItem<Section extends ReviewableSection>(
    section: Section,
    index: number,
    updater: (item: ChapterMemory[Section][number]) => ChapterMemory[Section][number]
  ) {
    setMemory((current) => {
      const nextItems = [...current[section]] as ChapterMemory[Section];
      nextItems[index] = updater(nextItems[index]);
      return { ...current, [section]: nextItems };
    });
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
            {validationIssues.length > 0 ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                {validationIssues.slice(0, 4).map((issue) => <p key={issue}>{issue}</p>)}
              </div>
            ) : null}
          </div>

          <div className="space-y-6 p-6">
            <section>
              <SectionHeading icon={<FileText size={16} />} title="Chapter Summaries" />
              <SummaryCard label="Short" content={memory.summaries.shortSummary} active onChange={(value) => updateSummary("shortSummary", value)} />
              <SummaryCard label="Medium" content={memory.summaries.mediumSummary} onChange={(value) => updateSummary("mediumSummary", value)} />
              <SummaryCard label="Long" content={memory.summaries.longSummary} onChange={(value) => updateSummary("longSummary", value)} />
            </section>

            <section>
              <SectionHeading icon={<PersonStanding size={16} />} title="Character States" />
              <div className="space-y-3">
                {memory.characterStates.length > 0 ? memory.characterStates.map((character, index) => (
                  <EditableCard
                    key={`${character.name}-${index}`}
                    title={character.name}
                    section="characterStates"
                    index={index}
                    included={isIncluded(inclusions, "characterStates", index)}
                    importance={character.importance}
                    persistence={character.persistence}
                    onToggle={toggle}
                    onImportance={(importance) => updateArrayItem("characterStates", index, (item) => ({ ...item, importance }))}
                    onPersistence={(persistence) => updateArrayItem("characterStates", index, (item) => ({ ...item, persistence }))}
                  >
                    <LabeledInput label="Name" value={character.name} onChange={(value) => updateArrayItem("characterStates", index, (item) => ({ ...item, name: value }))} />
                    <LabeledTextarea label="Status" value={character.statusAtChapterEnd ?? ""} onChange={(value) => updateArrayItem("characterStates", index, (item) => ({ ...item, statusAtChapterEnd: value }))} />
                    <LabeledTextarea label="Emotional state" value={character.emotionalState ?? ""} onChange={(value) => updateArrayItem("characterStates", index, (item) => ({ ...item, emotionalState: value }))} />
                    <LabeledTextarea label="Continuity notes" value={character.continuityNotes.join("\n")} onChange={(value) => updateArrayItem("characterStates", index, (item) => ({ ...item, continuityNotes: lines(value) }))} />
                  </EditableCard>
                )) : <EmptyMemory label="No character states extracted yet." />}
              </div>
            </section>

            <section>
              <SectionHeading title="New Canon Facts" />
              <div className="space-y-3">
                {memory.canonFactsEstablished.map((fact, index) => (
                  <EditableCard
                    key={`${fact.category}-${index}`}
                    title={fact.category}
                    section="canonFactsEstablished"
                    index={index}
                    included={isIncluded(inclusions, "canonFactsEstablished", index)}
                    importance={fact.importance}
                    persistence={fact.persistence}
                    onToggle={toggle}
                    onImportance={(importance) => updateArrayItem("canonFactsEstablished", index, (item) => ({ ...item, importance }))}
                    onPersistence={(persistence) => updateArrayItem("canonFactsEstablished", index, (item) => ({ ...item, persistence }))}
                  >
                    <LabeledInput label="Category" value={fact.category} onChange={(value) => updateArrayItem("canonFactsEstablished", index, (item) => ({ ...item, category: value }))} />
                    <LabeledTextarea label="Fact" value={fact.fact} onChange={(value) => updateArrayItem("canonFactsEstablished", index, (item) => ({ ...item, fact: value }))} />
                    <LabeledTextarea label="Evidence" value={fact.evidenceOrBasis ?? ""} onChange={(value) => updateArrayItem("canonFactsEstablished", index, (item) => ({ ...item, evidenceOrBasis: value || undefined }))} />
                  </EditableCard>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading title="Open Threads" />
              <div className="space-y-3">
                {memory.openThreads.length > 0 ? memory.openThreads.map((thread, index) => (
                  <EditableCard
                    key={`${thread.thread}-${index}`}
                    title={thread.thread}
                    section="openThreads"
                    index={index}
                    included={isIncluded(inclusions, "openThreads", index)}
                    importance={thread.importance}
                    persistence={thread.persistence}
                    onToggle={toggle}
                    onImportance={(importance) => updateArrayItem("openThreads", index, (item) => ({ ...item, importance }))}
                    onPersistence={(persistence) => updateArrayItem("openThreads", index, (item) => ({ ...item, persistence }))}
                  >
                    <LabeledInput label="Thread" value={thread.thread} onChange={(value) => updateArrayItem("openThreads", index, (item) => ({ ...item, thread: value }))} />
                    <LabeledTextarea label="Status" value={thread.status} onChange={(value) => updateArrayItem("openThreads", index, (item) => ({ ...item, status: value }))} />
                    <LabeledTextarea label="Future relevance" value={thread.futureRelevance ?? ""} onChange={(value) => updateArrayItem("openThreads", index, (item) => ({ ...item, futureRelevance: value }))} />
                  </EditableCard>
                )) : <EmptyMemory label="No open threads extracted." />}
              </div>
            </section>

            <section>
              <SectionHeading title="Continuity Warnings" />
              <div className="space-y-3">
                {memory.continuityWarnings.length > 0 ? memory.continuityWarnings.map((warning, index) => (
                  <EditableCard
                    key={`${warning.warning}-${index}`}
                    title={warning.warning}
                    section="continuityWarnings"
                    index={index}
                    included={isIncluded(inclusions, "continuityWarnings", index)}
                    importance={warning.importance}
                    persistence={warning.persistence}
                    onToggle={toggle}
                    onImportance={(importance) => updateArrayItem("continuityWarnings", index, (item) => ({ ...item, importance }))}
                    onPersistence={(persistence) => updateArrayItem("continuityWarnings", index, (item) => ({ ...item, persistence }))}
                  >
                    <LabeledInput label="Warning" value={warning.warning} onChange={(value) => updateArrayItem("continuityWarnings", index, (item) => ({ ...item, warning: value }))} />
                    <LabeledTextarea label="Possible contradiction" value={warning.possibleContradiction ?? ""} onChange={(value) => updateArrayItem("continuityWarnings", index, (item) => ({ ...item, possibleContradiction: value }))} />
                    <LabeledTextarea label="Suggested handling" value={warning.suggestedHandling ?? ""} onChange={(value) => updateArrayItem("continuityWarnings", index, (item) => ({ ...item, suggestedHandling: value }))} />
                  </EditableCard>
                )) : <EmptyMemory label="No continuity warnings extracted." />}
              </div>
            </section>

            <section>
              <SectionHeading title="Do Not Forget" />
              <div className="space-y-3">
                {memory.doNotForget.length > 0 ? memory.doNotForget.map((reminder, index) => (
                  <EditableCard
                    key={`${reminder.item}-${index}`}
                    title={reminder.item}
                    section="doNotForget"
                    index={index}
                    included={isIncluded(inclusions, "doNotForget", index)}
                    importance={reminder.importance}
                    persistence={reminder.persistence}
                    onToggle={toggle}
                    onImportance={(importance) => updateArrayItem("doNotForget", index, (item) => ({ ...item, importance }))}
                    onPersistence={(persistence) => updateArrayItem("doNotForget", index, (item) => ({ ...item, persistence }))}
                  >
                    <LabeledTextarea label="Item" value={reminder.item} onChange={(value) => updateArrayItem("doNotForget", index, (item) => ({ ...item, item: value }))} />
                    <LabeledTextarea label="Reason" value={reminder.reason ?? ""} onChange={(value) => updateArrayItem("doNotForget", index, (item) => ({ ...item, reason: value }))} />
                  </EditableCard>
                )) : <EmptyMemory label="No do-not-forget items extracted." />}
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

function SummaryCard({ label, content, active = false, onChange }: { label: string; content: string; active?: boolean; onChange: (value: string) => void }) {
  return (
    <div className="mb-3 rounded-md border border-memory-border bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={active ? "rounded bg-intelligence-glow px-2 py-0.5 text-xs font-bold text-intelligence-teal" : "rounded bg-surface-container px-2 py-0.5 text-xs font-bold text-on-surface-variant"}>{label}</span>
        <div className="flex items-center gap-3">
          <Edit3 size={17} className="text-on-surface-variant" />
          <ImportancePill importance={active ? "critical" : "major"} />
        </div>
      </div>
      <textarea
        value={content}
        onChange={(event) => onChange(event.target.value)}
        rows={active ? 3 : 5}
        className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm leading-6 text-on-surface-variant outline-none focus:border-intelligence-teal"
      />
    </div>
  );
}

function EmptyMemory({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{label}</div>;
}

function EditableCard({
  title,
  section,
  index,
  included,
  importance,
  persistence,
  onToggle,
  onImportance,
  onPersistence,
  children
}: {
  title: string;
  section: ReviewableSection;
  index: number;
  included: boolean;
  importance: Importance;
  persistence?: Persistence;
  onToggle: (section: ReviewableSection, index: number) => void;
  onImportance: (importance: Importance) => void;
  onPersistence: (persistence: Persistence) => void;
  children: ReactNode;
}) {
  return (
    <div className={included ? "rounded-md border border-memory-border bg-white p-4" : "rounded-md border border-outline-variant bg-surface-container-low p-4 opacity-70"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-primary">{title}</p>
          <p className="text-xs font-bold uppercase text-on-surface-variant">{included ? "Included in commit" : "Excluded from commit"}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-bold uppercase text-on-surface-variant">
          <input type="checkbox" checked={included} onChange={() => onToggle(section, index)} />
          Include
        </label>
      </div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold uppercase text-on-surface-variant">
          Importance
          <select value={importance} onChange={(event) => onImportance(event.target.value as Importance)} className="mt-1 w-full rounded-md border border-outline-variant px-3 py-2 text-sm normal-case text-on-surface outline-none focus:border-intelligence-teal">
            {importanceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold uppercase text-on-surface-variant">
          Persistence
          <select value={persistence ?? "unclear"} onChange={(event) => onPersistence(event.target.value as Persistence)} className="mt-1 w-full rounded-md border border-outline-variant px-3 py-2 text-sm normal-case text-on-surface outline-none focus:border-intelligence-teal">
            {persistenceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-bold uppercase text-on-surface-variant">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-outline-variant px-3 py-2 text-sm normal-case text-on-surface outline-none focus:border-intelligence-teal" />
    </label>
  );
}

function LabeledTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-bold uppercase text-on-surface-variant">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-outline-variant px-3 py-2 text-sm normal-case leading-6 text-on-surface outline-none focus:border-intelligence-teal" />
    </label>
  );
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}
