import { AlertTriangle, BookOpen, Filter, MapPin, Search, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button, MemoryCard, SectionHeading } from "@/components/ui";
import { sampleBible } from "@/lib/sample-data";

const tabs = ["Characters", "Plot Threads", "Locations", "Worldbuilding", "Canon Facts"];

export default function StoryBiblePage() {
  const character = sampleBible.characters[0];

  return (
    <AppShell
      title="Codex"
      tabs={[
        { label: "Chapter 1", href: "/writing" },
        { label: "Drafts", href: "/writing/co-writer" },
        { label: "Outline", href: "/writing" }
      ]}
      action={<Button variant="secondary">Extract Memory</Button>}
    >
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <section className="mb-8">
          <p className="ui-label mb-3 text-intelligence-teal">Story Bible</p>
          <h2 className="headline-serif text-3xl text-primary md:text-[40px]">Continuity Explorer</h2>
          <p className="mt-2 max-w-2xl text-on-surface-variant">A living database of the story world, tracked through structured memory and semantic retrieval.</p>
        </section>

        <div className="mb-8 flex gap-6 overflow-x-auto border-b border-outline-variant">
          {tabs.map((tab, index) => (
            <button key={tab} className={index === 0 ? "border-b-2 border-intelligence-teal pb-3 text-sm font-bold text-intelligence-teal" : "pb-3 text-sm font-bold text-on-surface-variant hover:text-primary"}>
              {tab}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="space-y-5 lg:col-span-4">
            <div className="rounded-lg border border-memory-border bg-white p-5 soft-shadow">
              <div className="mb-5 aspect-square rounded-lg bg-gradient-to-br from-surface-container-low to-intelligence-glow p-6">
                <div className="flex h-full items-end rounded-md bg-primary-container p-4 text-parchment-base">
                  <div>
                    <span className="mb-3 inline-block rounded bg-intelligence-teal px-2 py-1 text-[10px] font-bold uppercase text-white">Critical</span>
                    <h3 className="headline-serif text-2xl">Elias</h3>
                    <p className="text-sm text-on-primary-container">Unreliable memory keeper</p>
                  </div>
                </div>
              </div>
              <h4 className="headline-serif text-2xl text-primary">{character?.name ?? "Elias"}</h4>
              <p className="mt-1 text-sm font-bold text-intelligence-teal">{character?.roleInStory ?? "Protagonist"}</p>
              <div className="mt-5 space-y-4 border-t border-outline-variant/30 pt-5">
                <Fact label="Current State" value={character?.statusAtChapterEnd ?? "Confronting a continuity rupture."} />
                <Fact label="Core Motivation" value={character?.goalsAndMotivations.join(" ") ?? "Understand the mirror."} />
              </div>
            </div>

            <div className="rounded-lg border border-memory-border bg-white p-5">
              <SectionHeading icon={<Users size={16} />} title="Key Relationships" />
              <div className="space-y-3 text-sm text-on-surface-variant">
                <Relationship name="Elena" tag="Contradiction" />
                <Relationship name="Grandmother" tag="Origin" />
              </div>
            </div>
          </aside>

          <section className="space-y-5 lg:col-span-8">
            <div className="flex flex-col gap-3 rounded-lg border border-memory-border bg-white p-4 md:flex-row md:items-center">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input className="w-full border-0 bg-transparent py-2 pl-10 pr-3 text-sm font-bold outline-none" placeholder="Search knowledge, traits, or evidence..." />
              </label>
              <Button variant="secondary"><Filter size={16} />Filter</Button>
            </div>

            <section>
              <SectionHeading icon={<BookOpen size={16} />} title="Canonical Facts" />
              <div className="grid gap-3 md:grid-cols-2">
                {sampleBible.importantObjects.map((object) => (
                  <MemoryCard key={object.name} title={object.name} importance={object.importance} meta={object.evidenceOrBasis}>
                    {object.significance}
                  </MemoryCard>
                ))}
                {sampleBible.importantLocations.map((location) => (
                  <MemoryCard key={location.name} title={location.name} importance={location.importance} meta={location.evidenceOrBasis}>
                    {location.significance}
                  </MemoryCard>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading icon={<AlertTriangle size={16} />} title="Intelligence & Secrets" />
              <div className="space-y-3">
                {sampleBible.openThreads.map((thread) => (
                  <MemoryCard key={thread.thread} title={thread.thread} importance={thread.importance} meta={thread.evidenceOrBasis}>
                    {thread.futureRelevance}
                  </MemoryCard>
                ))}
              </div>
            </section>

            <div className="rounded-lg bg-primary-container p-5 text-parchment-base">
              <div className="mb-3 flex items-center gap-2 text-intelligence-teal">
                <MapPin size={17} />
                <h5 className="font-bold">Continuity Syncing...</h5>
              </div>
              <p className="text-sm italic text-on-primary-container">The Story Memory engine is analyzing the latest draft to update canonical state and the knowledge graph.</p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="ui-label mb-1 text-on-primary-container">{label}</p>
      <p className="text-sm leading-6 text-on-surface-variant">{value}</p>
    </div>
  );
}

function Relationship({ name, tag }: { name: string; tag: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{name}</span>
      <span className="rounded-full bg-intelligence-glow px-2 py-0.5 text-[11px] font-bold text-intelligence-teal">{tag}</span>
    </div>
  );
}
