"use client";

import { AlertTriangle, Brain, MessageCircle, Pin, Send, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, ImportancePill, MemoryCard, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { sampleContext } from "@/lib/sample-data";
import type { ChapterContext } from "@/lib/story-memory/schema";

export function ContinuityContextPanel({
  coWriter = false,
  chapterId,
  actionResult
}: {
  coWriter?: boolean;
  chapterId?: string;
  actionResult?: string;
}) {
  const [context, setContext] = useState<ChapterContext>(sampleContext);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) {
      setContext(sampleContext);
      return;
    }

    apiFetch<{ context: ChapterContext }>(`/api/chapters/${chapterId}/context?limit=8`)
      .then((response) => {
        setContext(response.context);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, [chapterId]);

  return (
    <section className="w-full">
      {coWriter ? <CoWriterCard /> : null}

      {actionResult ? (
        <section className="mb-8 rounded-md border border-intelligence-teal/40 bg-white p-4">
          <SectionHeading icon={<WandSparkles size={16} />} title="AI Result" />
          <p className="whitespace-pre-line text-sm leading-6 text-on-surface-variant">{actionResult}</p>
        </section>
      ) : null}

      <SectionHeading icon={<Brain size={16} />} title="Continuity Context" />
      {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      {context.storyFoundationContext ? (
        <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase text-intelligence-teal">Story Foundation / {context.storyFoundationContext.status}</p>
          <p className="text-sm font-bold text-primary">{context.storyFoundationContext.premise}</p>
          <p className="mt-2 line-clamp-4 text-sm leading-6 text-on-surface-variant">{context.storyFoundationContext.readerPromise}</p>
        </div>
      ) : null}
      <div className="space-y-3">
        {context.relevantMemoryItems.length > 0 ? context.relevantMemoryItems.map((item) => (
          <MemoryCard
            key={item.id}
            title={item.label}
            importance={item.importance}
            meta={`${item.sourceChapterNumber ? `Chapter ${item.sourceChapterNumber}` : "Story Bible"}${item.similarity ? ` / ${Math.round(item.similarity * 100)}% match` : ""}`}
          >
            <p>{item.content}</p>
            {item.evidenceOrBasis ? <p className="mt-2 italic">Evidence: {item.evidenceOrBasis}</p> : null}
          </MemoryCard>
        )) : <p className="rounded-md border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">No semantic memory matches yet.</p>}
      </div>

      <div className="mt-8">
        <SectionHeading icon={<Pin size={15} />} title="Open Threads" />
        <div className="space-y-3">
          {context.openThreads.length > 0 ? context.openThreads.map((thread) => (
            <MemoryCard key={thread.thread} title={thread.thread} importance={thread.importance} meta={thread.status}>
              <p>{thread.futureRelevance}</p>
            </MemoryCard>
          )) : <p className="rounded-md border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">No open threads in context.</p>}
        </div>
      </div>

      <div className="mt-8">
        <SectionHeading icon={<AlertTriangle size={16} />} title="Context Package" />
        <div className="space-y-3 text-sm text-on-surface-variant">
          {context.previousLongSummary ? <PackageLine label="Previous long summary" value={context.previousLongSummary} /> : null}
          {context.recentMediumSummaries.map((summary) => <PackageLine key={summary.chapterNumber} label={`Chapter ${summary.chapterNumber} medium`} value={summary.summary} />)}
          {context.olderShortSummaries.slice(0, 3).map((summary) => <PackageLine key={summary.chapterNumber} label={`Chapter ${summary.chapterNumber} short`} value={summary.summary} />)}
          {context.criticalFacts.slice(0, 4).map((fact) => <PackageLine key={fact.fact} label="Critical fact" value={fact.fact} />)}
        </div>
      </div>
    </section>
  );
}

function PackageLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-memory-border bg-white p-3">
      <p className="text-xs font-bold uppercase text-intelligence-teal">{label}</p>
      <p className="mt-1 line-clamp-4 leading-6">{value}</p>
    </div>
  );
}

function CoWriterCard() {
  return (
    <section className="mb-8 border-b border-outline-variant pb-6">
      <SectionHeading icon={<MessageCircle size={16} />} title="AI Co-writer" />
      <div className="mb-4 max-h-48 space-y-3 overflow-y-auto pr-1 text-xs">
        <div>
          <p className="font-bold text-intelligence-teal">User</p>
          <p className="italic text-on-surface-variant">Make this scene more atmospheric.</p>
        </div>
        <div className="rounded-md border border-memory-border bg-white p-3">
          <p className="font-bold text-primary">AI</p>
          <p className="text-on-surface-variant">I strengthened the rain imagery and made the mirror feel physically uncanny.</p>
        </div>
      </div>
      <div className="relative">
        <input className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 pr-10 text-xs outline-none focus:border-intelligence-teal" placeholder="Command: Rewrite the last paragraph..." />
        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-intelligence-teal" aria-label="Send revision">
          <Send size={16} />
        </button>
      </div>
      <Button variant="teal" className="mt-3 w-full text-xs">
        <WandSparkles size={16} />
        Revise Draft
      </Button>
    </section>
  );
}

export function InlineContextBadge({ importance = "critical" }: { importance?: "critical" | "major" | "minor" }) {
  return <ImportancePill importance={importance} />;
}
