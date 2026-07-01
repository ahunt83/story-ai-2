import { CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui";
import { sampleChapterText } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export function WritingCanvas({
  mode = "draft",
  title,
  text
}: {
  mode?: "draft" | "cowriter" | "readonly";
  title?: string;
  text?: string;
}) {
  const displayText = text?.trim() ? text : sampleChapterText;
  const displayTitle = title ?? (mode === "cowriter" ? "Collaborative Draft: Chapter 4" : "Chapter 4: The Shattered Mirror");
  const wordCount = displayText.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 260));

  return (
    <section className={cn("writing-surface flex-1 overflow-y-auto bg-parchment-base px-5 py-10 md:px-12 xl:px-canvas", mode === "readonly" && "border-r border-outline-variant/40")}>
      <article className="mx-auto max-w-[800px] pb-40">
        <div className="mb-8 flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-[0.16em] text-on-primary-container">
          <span>Words: {wordCount.toLocaleString()}</span>
          <span className="h-1 w-1 rounded-full bg-outline" />
          <span>Reading Time: {readingTime}m</span>
        </div>
        <h2 className="headline-serif mb-8 border-b border-memory-border pb-5 text-3xl italic text-primary md:text-[40px]">
          {displayTitle}
        </h2>
        {mode === "cowriter" && !text ? <CoWriterProse /> : <Prose text={displayText} />}
        {mode === "cowriter" ? (
          <div className="sticky bottom-6 mt-16 flex justify-center gap-3">
            <Button variant="teal" className="rounded-full shadow-lg"><CheckCircle size={17} />Accept All</Button>
            <Button variant="secondary" className="rounded-full shadow-lg"><XCircle size={17} />Reject All</Button>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <div className="story-prose whitespace-pre-line text-on-surface">
      {text}
    </div>
  );
}

function CoWriterProse() {
  return (
    <div className="story-prose space-y-8 text-on-surface">
      <p className="ui-label text-intelligence-teal">AI Draft in progress...</p>
      <p>
        The rain against the attic window sounded like the <span className="border-b-2 border-intelligence-teal bg-intelligence-glow">rhythmic drumming</span>{" "}
        <span className="opacity-50 line-through">frantic typing</span> of a thousand ghostly stenographers. Elias stood before the vanity, his reflection fractured into a dozen jagged versions of himself.
      </p>
      <p>
        He reached out a hand, his fingers hovering just inches from the sharpest shard. <span className="border-b-2 border-intelligence-teal bg-intelligence-glow">The glass felt cold, vibrating with a frequency he couldn't name.</span> In the Story Bible, he had written that this mirror was a gift from his grandmother.
      </p>
    </div>
  );
}
