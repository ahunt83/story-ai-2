"use client";

import { CheckCircle2, Loader2, RefreshCw, Save, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button, MemoryCard, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import type { StoryFoundation, StoryFoundationStatus } from "@/lib/story-foundation/schema";

type FoundationResponse = {
  story: { id: string; title: string };
  foundation: StoryFoundation | null;
  foundationId: string | null;
  status: StoryFoundationStatus | null;
  chapterId: string | null;
  updatedAt: string | null;
};

export function FoundationWorkspace() {
  const searchParams = useSearchParams();
  const storyId = searchParams.get("storyId");
  const chapterId = searchParams.get("chapterId");
  const [data, setData] = useState<FoundationResponse | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(Boolean(storyId || chapterId));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!storyId && !chapterId) {
      setLoading(false);
      return;
    }

    resolveAndLoad().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, [chapterId, storyId]);

  async function resolveAndLoad() {
    if (storyId) {
      await loadFoundation(storyId);
      return;
    }

    if (chapterId) {
      const chapter = await apiFetch<{ story: { id: string } }>(`/api/chapters/${chapterId}`);
      await loadFoundation(chapter.story.id);
    }
  }

  async function loadFoundation(id: string) {
    setLoading(true);
    setError(null);
    const response = await apiFetch<FoundationResponse>(`/api/stories/${id}/foundation`);
    setData(response);
    setJsonText(response.foundation ? JSON.stringify(response.foundation, null, 2) : "");
    setLoading(false);
  }

  async function saveFoundation() {
    const targetStoryId = storyId ?? data?.story.id;
    if (!targetStoryId) return;
    setBusy("save");
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(jsonText) as StoryFoundation;
      const response = await apiFetch<{ foundation: StoryFoundation; status: StoryFoundationStatus }>(`/api/stories/${targetStoryId}/foundation`, {
        method: "PATCH",
        body: JSON.stringify({ foundation: parsed })
      });
      setData((current) => current ? { ...current, foundation: response.foundation, status: response.status } : current);
      setJsonText(JSON.stringify(response.foundation, null, 2));
      setMessage("Foundation saved as draft.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save foundation");
    } finally {
      setBusy(null);
    }
  }

  async function regenerateFoundation() {
    const targetStoryId = storyId ?? data?.story.id;
    if (!targetStoryId) return;
    setBusy("regenerate");
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{ foundation: StoryFoundation; status: StoryFoundationStatus }>(`/api/stories/${targetStoryId}/foundation/regenerate`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setData((current) => current ? { ...current, foundation: response.foundation, status: response.status } : current);
      setJsonText(JSON.stringify(response.foundation, null, 2));
      setMessage("Foundation regenerated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not regenerate foundation");
    } finally {
      setBusy(null);
    }
  }

  async function approveFoundation() {
    const targetStoryId = storyId ?? data?.story.id;
    if (!targetStoryId) return;
    setBusy("approve");
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(jsonText) as StoryFoundation;
      await apiFetch(`/api/stories/${targetStoryId}/foundation`, {
        method: "PATCH",
        body: JSON.stringify({ foundation: parsed })
      });
      const response = await apiFetch<{ foundation: StoryFoundation; status: StoryFoundationStatus; chapterId: string | null }>(`/api/stories/${targetStoryId}/foundation/approve`, {
        method: "POST",
        body: JSON.stringify({})
      });
      window.location.href = response.chapterId ? `/writing?chapterId=${response.chapterId}` : `/writing?storyId=${targetStoryId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve foundation");
      setBusy(null);
    }
  }

  const foundation = useMemo(() => {
    try {
      return jsonText ? (JSON.parse(jsonText) as StoryFoundation) : data?.foundation;
    } catch {
      return data?.foundation;
    }
  }, [data?.foundation, jsonText]);

  const story = data?.story;
  const tabs = story ? [
    { label: "Foundation", href: `/foundation?storyId=${story.id}`, active: true },
    { label: "Writing", href: data?.chapterId ? `/writing?chapterId=${data.chapterId}` : `/writing?storyId=${story.id}` },
    { label: "Bible", href: `/bible?storyId=${story.id}` }
  ] : undefined;

  return (
    <AppShell
      title={story?.title ?? "Story Foundation"}
      activeTab="Foundation"
      tabs={tabs}
      action={story ? <Link href={data?.chapterId ? `/writing?chapterId=${data.chapterId}` : `/writing?storyId=${story.id}`} className="hidden rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:opacity-90 sm:inline-flex">Writing</Link> : undefined}
    >
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        {!storyId && !chapterId ? (
          <section className="rounded-md border border-dashed border-outline-variant bg-white p-6 text-center">
            <p className="ui-label mb-3 text-intelligence-teal">No Story</p>
            <h2 className="headline-serif text-3xl text-primary">Open a manuscript foundation</h2>
            <Link href="/" className="mt-5 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:opacity-90">Go to Library</Link>
          </section>
        ) : loading ? (
          <div className="flex min-h-96 items-center justify-center gap-3 text-on-surface-variant"><Loader2 className="animate-spin" size={20} />Loading foundation...</div>
        ) : (
          <>
            <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="ui-label mb-3 text-intelligence-teal">Initial Story Plan</p>
                <h2 className="headline-serif text-3xl text-primary md:text-[40px]">Story Foundation</h2>
                <p className="mt-2 max-w-2xl text-on-surface-variant">
                  Status: <span className="font-bold uppercase text-intelligence-teal">{data?.status ?? "missing"}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={regenerateFoundation} disabled={Boolean(busy)}><RefreshCw size={16} />Regenerate</Button>
                <Button variant="secondary" onClick={saveFoundation} disabled={Boolean(busy)}><Save size={16} />Save Draft</Button>
                <Button variant="teal" onClick={approveFoundation} disabled={Boolean(busy)}><CheckCircle2 size={16} />Approve and Start Writing</Button>
              </div>
            </section>

            {error ? <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div> : null}
            {message ? <div className="mb-5 rounded-md border border-intelligence-teal/30 bg-intelligence-glow p-3 text-sm font-bold text-intelligence-teal">{message}</div> : null}

            {foundation ? (
              <div className="grid gap-6 lg:grid-cols-12">
                <section className="space-y-5 lg:col-span-5">
                  <FoundationOverview foundation={foundation} />
                </section>
                <section className="lg:col-span-7">
                  <SectionHeading icon={<WandSparkles size={16} />} title="Structured Plan" />
                  <textarea
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    spellCheck={false}
                    className="min-h-[720px] w-full rounded-md border border-outline-variant bg-white p-4 font-mono text-xs leading-5 text-on-surface outline-none focus:border-intelligence-teal"
                  />
                </section>
              </div>
            ) : (
              <section className="rounded-md border border-dashed border-outline-variant bg-white p-6 text-center">
                <h3 className="headline-serif text-2xl text-primary">No foundation yet</h3>
                <Button variant="teal" className="mt-5" onClick={regenerateFoundation} disabled={Boolean(busy)}><RefreshCw size={16} />Generate Foundation</Button>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function FoundationOverview({ foundation }: { foundation: StoryFoundation }) {
  return (
    <>
      <MemoryCard title="Core Concept">
        <p className="font-bold text-primary">{foundation.coreConcept.premise}</p>
        <p className="mt-2">{foundation.coreConcept.readerPromise}</p>
        <p className="mt-2 italic">{foundation.coreConcept.storyQuestion}</p>
      </MemoryCard>
      <MemoryCard title="Genre, Audience, Boundaries">
        <p>{foundation.genre.genreBlend || foundation.genre.primaryGenre}</p>
        <p className="mt-2">{foundation.audienceAndBoundaries.targetAudience}</p>
        <p className="mt-2 font-bold text-primary">{foundation.audienceAndBoundaries.contentRating}</p>
        {foundation.audienceAndBoundaries.hardExclusions.length ? <p className="mt-2">Hard exclusions: {foundation.audienceAndBoundaries.hardExclusions.join(", ")}</p> : null}
      </MemoryCard>
      <MemoryCard title="Style Guide">
        <p>{foundation.styleGuide.pov} / {foundation.styleGuide.tense} / {foundation.styleGuide.narrativeDistance}</p>
        <p className="mt-2">{foundation.styleGuide.proseStyle}</p>
        <p className="mt-2">{foundation.styleGuide.dialogueStyle}</p>
      </MemoryCard>
      <MemoryCard title="Chapter 1 Brief">
        <p>{foundation.chapter1Brief.purpose}</p>
        <p className="mt-2">{foundation.chapter1Brief.openingImageOrSituation}</p>
        <p className="mt-2 font-bold text-primary">{foundation.chapter1Brief.endingHook}</p>
      </MemoryCard>
      <MemoryCard title="Assumptions and Gaps">
        <List label="Explicit" items={foundation.assumptionsAndGaps.explicitUserRequirements} />
        <List label="Inferred" items={foundation.assumptionsAndGaps.inferredChoices} />
        <List label="Questions" items={foundation.assumptionsAndGaps.recommendedClarifyingQuestions} />
      </MemoryCard>
    </>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-bold uppercase text-intelligence-teal">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
