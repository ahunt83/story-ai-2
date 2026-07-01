import { AlertTriangle, Brain, MessageCircle, Pin, Send, WandSparkles } from "lucide-react";

import { Button, ImportancePill, MemoryCard, SectionHeading } from "@/components/ui";
import { sampleContext } from "@/lib/sample-data";

export function ContinuityContextPanel({ coWriter = false, actionResult }: { coWriter?: boolean; actionResult?: string }) {
  return (
    <aside className="w-full border-l border-outline-variant bg-surface-container-low p-6 lg:w-80 lg:overflow-y-auto">
      {coWriter ? <CoWriterCard /> : null}

      {actionResult ? (
        <section className="mb-8 rounded-md border border-intelligence-teal/40 bg-white p-4">
          <SectionHeading icon={<WandSparkles size={16} />} title="AI Result" />
          <p className="whitespace-pre-line text-sm leading-6 text-on-surface-variant">{actionResult}</p>
        </section>
      ) : null}

      <SectionHeading icon={<Brain size={16} />} title="Continuity Context" />
      <div className="space-y-3">
        {sampleContext.relevantMemoryItems.map((item) => (
          <MemoryCard
            key={item.id}
            title={item.label}
            importance={item.importance}
            meta={`${item.sourceChapterNumber ? `Chapter ${item.sourceChapterNumber}` : "Story Bible"}${item.similarity ? ` · ${Math.round(item.similarity * 100)}% match` : ""}`}
          >
            <p>{item.content}</p>
            {item.evidenceOrBasis ? <p className="mt-2 italic">Evidence: {item.evidenceOrBasis}</p> : null}
          </MemoryCard>
        ))}
      </div>

      <div className="mt-8">
        <SectionHeading icon={<Pin size={15} />} title="Open Threads" />
        <div className="space-y-3">
          {sampleContext.openThreads.map((thread) => (
            <MemoryCard key={thread.thread} title={thread.thread} importance={thread.importance} meta={thread.status}>
              <p>{thread.futureRelevance}</p>
            </MemoryCard>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-md border border-intelligence-teal/30 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-intelligence-teal">
          <AlertTriangle size={16} />
          <span className="ui-label">Memory Sync</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-container">
          <div className="h-full w-3/4 animate-pulse bg-intelligence-teal" />
        </div>
        <p className="mt-3 text-xs leading-5 text-on-surface-variant">Context package combines chapter summaries, critical facts, open threads, and semantic memory matches.</p>
      </div>
    </aside>
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
