"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, BookOpen, Filter, Loader2, MapPin, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button, MemoryCard, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import type { Importance, StoryBible } from "@/lib/story-memory/schema";
import type { StoryFoundationContext } from "@/lib/story-foundation/schema";

type StorySummary = {
  id: string;
  title: string;
};

type MemoryRow = {
  id: string;
  category: string;
  label: string;
  content: string;
  importance: Importance;
  persistence?: string;
  evidenceOrBasis?: string;
  sourceChapterNumber?: number;
  similarity?: number;
};

type BibleResponse = {
  bible: StoryBible | null;
  characters: StoryBible["characters"];
  locations: StoryBible["importantLocations"];
  objects: StoryBible["importantObjects"];
  openThreads: StoryBible["openThreads"];
  resolvedThreads: StoryBible["resolvedThreads"];
  warnings: StoryBible["continuityWarnings"];
  foundationStatus: "draft" | "approved" | null;
  foundationContext: StoryFoundationContext | null;
  memoryItems: MemoryRow[];
  lastUpdatedFromChapterNumber: number;
};

const tabs = [
  { label: "Characters", categories: ["character_state"] },
  { label: "Plot Threads", categories: ["open_thread", "resolved_thread", "continuity_warning"] },
  { label: "Locations", categories: ["location"] },
  { label: "Worldbuilding", categories: ["worldbuilding"] },
  { label: "Canon Facts", categories: ["canon_fact", "object", "summary"] }
];

export function StoryBibleWorkspace() {
  const searchParams = useSearchParams();
  const requestedStoryId = searchParams.get("storyId");
  const requestedChapterId = searchParams.get("chapterId");
  const [story, setStory] = useState<StorySummary | null>(null);
  const [data, setData] = useState<BibleResponse | null>(null);
  const [activeTab, setActiveTab] = useState("Canon Facts");
  const [query, setQuery] = useState("");
  const [importance, setImportance] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const tab = tabs.find((item) => item.label === activeTab) ?? tabs[0];
  const category = tab.categories.length === 1 ? tab.categories[0] : "";

  useEffect(() => {
    async function resolveStory() {
      setLoading(true);
      setError(null);
      try {
        if (requestedStoryId) {
          const response = await apiFetch<{ story: StorySummary }>(`/api/stories/${requestedStoryId}`);
          setStory(response.story);
          return;
        }

        if (requestedChapterId) {
          const response = await apiFetch<{ story: StorySummary }>(`/api/chapters/${requestedChapterId}`);
          setStory(response.story);
          return;
        }

        const response = await apiFetch<{ stories: StorySummary[] }>("/api/stories");
        setStory(response.stories[0] ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load story");
      } finally {
        setLoading(false);
      }
    }

    resolveStory();
  }, [reloadKey, requestedChapterId, requestedStoryId]);

  useEffect(() => {
    if (!story?.id) {
      setData(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (importance) params.set("importance", importance);
        if (query.trim()) params.set("q", query.trim());
        const suffix = params.toString() ? `?${params}` : "";
        const response = await apiFetch<BibleResponse>(`/api/stories/${story.id}/bible${suffix}`);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load Story Bible");
      } finally {
        setLoading(false);
      }
    }, query ? 250 : 0);

    return () => window.clearTimeout(timeout);
  }, [reloadKey, story?.id, category, importance, query]);

  const rows = data?.memoryItems ?? [];
  const displayRows = hasUsableMemory(data, rows) ? rows : [];
  const character = data?.characters[0] ?? null;
  const openThreads = data?.openThreads ?? [];
  const warnings = data?.warnings ?? [];
  const hasLiveData = Boolean(data?.bible || rows.length > 0);

  const contextCopy = useMemo(() => {
    if (!story) return "Create a story and commit chapter memory to build a live Story Bible.";
    if (!hasLiveData) return "No committed memory yet. Extract and approve chapter memory to populate this explorer.";
    return `Live memory from ${story.title}. Last updated through chapter ${data?.lastUpdatedFromChapterNumber ?? 0}.`;
  }, [data?.lastUpdatedFromChapterNumber, hasLiveData, story]);

  return (
    <AppShell
      title={story?.title ?? "Codex"}
      tabs={[
        { label: "Foundation", href: story ? `/foundation?storyId=${story.id}` : "/foundation" },
        { label: "Writing", href: story ? `/writing?storyId=${story.id}` : "/writing" },
        { label: "Drafts", href: story ? `/writing/co-writer?storyId=${story.id}` : "/writing/co-writer" },
        { label: "Story Bible", href: story ? `/bible?storyId=${story.id}` : "/bible", active: true }
      ]}
      action={story ? <Link href={`/writing?storyId=${story.id}`} className="rounded-md bg-intelligence-teal px-4 py-2 text-sm font-bold text-on-primary transition hover:brightness-105">Back to Writing</Link> : <Link href="/" className="rounded-md bg-intelligence-teal px-4 py-2 text-sm font-bold text-on-primary transition hover:brightness-105">Create Story</Link>}
    >
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <section className="mb-8">
          <p className="ui-label mb-3 text-intelligence-teal">Story Bible</p>
          <h2 className="headline-serif text-3xl text-primary md:text-[40px]">Continuity Explorer</h2>
          <p className="mt-2 max-w-2xl text-on-surface-variant">{contextCopy}</p>
          {error ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
              <span>{error}</span>
              <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
            </div>
          ) : null}
        </section>

        {!loading && !story ? (
          <section className="rounded-md border border-dashed border-outline-variant bg-white p-6 text-center">
            <p className="ui-label mb-3 text-intelligence-teal">No Story</p>
            <h3 className="headline-serif text-2xl text-primary">Create a manuscript to build a Story Bible</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
              Once a chapter has committed memory, characters, threads, locations, and facts will appear here.
            </p>
            <Link href="/" className="mt-5 inline-flex items-center rounded-md bg-intelligence-teal px-4 py-2 text-sm font-bold text-on-primary transition hover:brightness-105">Go to Library</Link>
          </section>
        ) : null}

        {story ? <div className="mb-8 flex gap-6 overflow-x-auto border-b border-outline-variant">
          {tabs.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActiveTab(item.label)}
              className={item.label === activeTab ? "border-b-2 border-intelligence-teal pb-3 text-sm font-bold text-intelligence-teal" : "pb-3 text-sm font-bold text-on-surface-variant hover:text-primary"}
            >
              {item.label}
            </button>
          ))}
        </div> : null}

        {story ? <div className="grid gap-6 lg:grid-cols-12">
          <aside className="space-y-5 lg:col-span-4">
            <div className="rounded-md border border-memory-border bg-white p-5 soft-shadow">
              <div className="mb-5 aspect-square rounded-md bg-gradient-to-br from-surface-container-low to-intelligence-glow p-6">
                <div className="flex h-full items-end rounded-md bg-primary-container p-4 text-on-surface">
                  <div>
                    <span className="mb-3 inline-block rounded bg-intelligence-teal px-2 py-1 text-[10px] font-bold uppercase text-on-primary">{character?.importance ?? "pending"}</span>
                    <h3 className="headline-serif text-2xl">{character?.name ?? "No Character Yet"}</h3>
                    <p className="text-sm text-on-primary-container">{character?.roleInStory ?? "Commit memory to reveal live character state."}</p>
                  </div>
                </div>
              </div>
              <h4 className="headline-serif text-2xl text-primary">{character?.name ?? "Story Memory"}</h4>
              <p className="mt-1 text-sm font-bold text-intelligence-teal">{character?.locationAtChapterEnd ?? "Awaiting committed chapter memory"}</p>
              <div className="mt-5 space-y-4 border-t border-outline-variant/30 pt-5">
                <Fact label="Current State" value={character?.statusAtChapterEnd ?? "No live character state yet."} />
                <Fact label="Core Motivation" value={character?.goalsAndMotivations.join(" ") || "Approve memory to track goals and motivations."} />
              </div>
            </div>

          <div className="rounded-md border border-memory-border bg-white p-5">
              <SectionHeading icon={<BookOpen size={16} />} title="Initial Foundation" />
              {data?.foundationContext ? (
                <div className="space-y-3 text-sm leading-6 text-on-surface-variant">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-primary">Status</span>
                    <span className="rounded-full bg-intelligence-glow px-2 py-0.5 text-[11px] font-bold uppercase text-intelligence-teal">{data.foundationStatus}</span>
                  </div>
                  <Fact label="Premise" value={data.foundationContext.premise} />
                  <Fact label="Reader Promise" value={data.foundationContext.readerPromise} />
                  {story ? <Link href={`/foundation?storyId=${story.id}`} className="inline-flex text-sm font-bold text-intelligence-teal hover:text-primary">Review foundation</Link> : null}
                </div>
              ) : <p className="text-sm text-on-surface-variant">No initial foundation stored yet.</p>}
            </div>

            <div className="rounded-md border border-memory-border bg-white p-5">
              <SectionHeading icon={<Users size={16} />} title="Open Threads" />
              <div className="space-y-3 text-sm text-on-surface-variant">
                {openThreads.length > 0 ? openThreads.slice(0, 4).map((thread) => (
                  <div key={thread.thread} className="flex items-center justify-between gap-3">
                    <span>{thread.thread}</span>
                    <span className="rounded-full bg-intelligence-glow px-2 py-0.5 text-[11px] font-bold text-intelligence-teal">{thread.importance}</span>
                  </div>
                )) : <p>No open threads committed yet.</p>}
              </div>
            </div>
          </aside>

          <section className="space-y-5 lg:col-span-8">
            <div className="flex flex-col gap-3 rounded-md border border-memory-border bg-white p-4 md:flex-row md:items-center">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full border-0 bg-transparent py-2 pl-10 pr-3 text-sm font-bold outline-none"
                  placeholder="Search knowledge, traits, or evidence..."
                />
              </label>
              <label className="flex items-center gap-2 rounded-md border border-outline-variant bg-white px-3 py-2 text-sm font-bold text-on-surface-variant">
                <Filter size={16} />
                <select value={importance} onChange={(event) => setImportance(event.target.value)} className="bg-transparent outline-none">
                  <option value="">All importance</option>
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
              </label>
            </div>

            <section>
              <SectionHeading icon={<BookOpen size={16} />} title={activeTab === "Canon Facts" ? "Canonical Facts" : activeTab} />
              {loading ? (
                <div className="rounded-md border border-memory-border bg-white p-6 text-sm font-bold text-on-surface-variant"><Loader2 className="mr-2 inline animate-spin" size={16} />Loading memory...</div>
              ) : displayRows.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {displayRows.map((row) => (
                    <MemoryCard key={row.id} title={row.label} importance={row.importance} meta={row.evidenceOrBasis ?? chapterMeta(row.sourceChapterNumber)}>
                      <p>{row.content}</p>
                      <p className="mt-2 text-xs font-bold uppercase text-on-surface-variant">{row.category.replaceAll("_", " ")}</p>
                    </MemoryCard>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-6 text-sm text-on-surface-variant">
                  {query || importance ? "No matching memory yet." : "No committed memory yet. Run extraction from a chapter, review the results, then commit them to populate this view."}
                </div>
              )}
            </section>

            <section>
              <SectionHeading icon={<AlertTriangle size={16} />} title="Continuity Warnings" />
              <div className="space-y-3">
                {warnings.length > 0 ? warnings.map((warning) => (
                  <MemoryCard key={warning.warning} title={warning.warning} importance={warning.importance} meta={warning.evidenceOrBasis}>
                    {[warning.possibleContradiction, warning.suggestedHandling].filter(Boolean).join(" ")}
                  </MemoryCard>
                )) : <div className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-6 text-sm text-on-surface-variant">No continuity warnings committed yet.</div>}
              </div>
            </section>

            <div className="rounded-md bg-primary-container p-5 text-on-surface">
              <div className="mb-3 flex items-center gap-2 text-intelligence-teal">
                <MapPin size={17} />
                <h5 className="font-bold">{hasLiveData ? "Continuity synced" : "Continuity waiting"}</h5>
              </div>
              <p className="text-sm italic text-on-primary-container">{hasLiveData ? "Newly committed chapter memory appears here without restarting the app." : "Run extraction, edit approval items, then commit them to build live memory."}</p>
            </div>
          </section>
        </div> : null}
      </div>
    </AppShell>
  );
}

function hasUsableMemory(data: BibleResponse | null, rows: MemoryRow[]) {
  return Boolean(data?.bible || rows.length > 0);
}

function chapterMeta(sourceChapterNumber?: number) {
  return sourceChapterNumber ? `Chapter ${sourceChapterNumber}` : undefined;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="ui-label mb-1 text-on-primary-container">{label}</p>
      <p className="text-sm leading-6 text-on-surface-variant">{value}</p>
    </div>
  );
}
