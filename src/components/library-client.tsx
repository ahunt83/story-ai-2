"use client";

import { ArrowUpRight, BookOpen, FileText, Plus, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { AppShell, SearchBox } from "@/components/app-shell";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { sampleStories } from "@/lib/sample-data";

type StoryRow = {
  id: string;
  title: string;
  initialPrompt: string;
  genreToneNotes: string | null;
  status: string;
};

export function LibraryClient() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiFetch<{ stories: StoryRow[] }>("/api/stories")
      .then((data) => setStories(data.stories))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function createStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    const initialPrompt = String(form.get("initialPrompt") ?? "");
    const genreToneNotes = String(form.get("genreToneNotes") ?? "");

    try {
      const result = await apiFetch<{ storyId: string; chapterId: string; sceneId: string }>("/api/stories", {
        method: "POST",
        body: JSON.stringify({ title, initialPrompt, genreToneNotes })
      });
      window.location.href = `/writing?chapterId=${result.chapterId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create story");
      setCreating(false);
    }
  }

  const liveCards = useMemo(() => stories.map((story) => ({
    id: story.id,
    title: story.title,
    author: "Creative Professional",
    chapter: "Chapter 1",
    summary: story.initialPrompt,
    status: story.status,
    progress: 5,
    words: 0,
    memoryItems: 0,
    live: true
  })), [stories]);

  const cards = liveCards.length > 0 ? liveCards : sampleStories.map((story) => ({ ...story, live: false }));

  return (
    <AppShell
      title="Library"
      tabs={[
        { label: "All Stories", href: "/", active: true },
        { label: "Recent", href: "/" },
        { label: "Archived", href: "/" }
      ]}
      action={<SearchBox />}
    >
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <section className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="ui-label mb-3 text-intelligence-teal">Active Stories</p>
            <h2 className="headline-serif text-3xl text-primary md:text-[40px]">Your manuscripts</h2>
            <p className="mt-2 max-w-2xl text-on-surface-variant">
              {loading ? "Loading your local story library..." : liveCards.length > 0 ? "Live stories from Postgres are ready to write." : "No live stories yet. The cards below are design examples; create one to start the real flow."}
            </p>
            {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
          </div>
          <Button variant="teal" onClick={() => setOpen(true)}><Plus size={18} />Start a New Manuscript</Button>
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((story) => (
            <Link key={story.id} href={story.live ? `/writing?storyId=${story.id}` : "/writing"} className="group rounded-lg border border-memory-border bg-white p-5 transition hover:-translate-y-1 hover:border-intelligence-teal/40">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="rounded-md bg-intelligence-glow p-3 text-intelligence-teal">
                  <BookOpen size={22} />
                </div>
                <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-on-surface-variant">{story.live ? "Live" : story.status}</span>
              </div>
              <h3 className="headline-serif text-2xl text-primary">{story.title}</h3>
              <p className="mt-2 min-h-12 line-clamp-3 text-sm leading-6 text-on-surface-variant">{story.summary}</p>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs font-bold uppercase text-on-primary-container">
                  <span>{story.chapter}</span>
                  <span>{story.progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                  <div className="h-full bg-intelligence-teal" style={{ width: `${story.progress}%` }} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-memory-border pt-4 text-xs font-bold text-on-surface-variant">
                <span>{story.words.toLocaleString()} words</span>
                <span>{story.memoryItems} memories</span>
                <ArrowUpRight className="transition group-hover:text-intelligence-teal" size={17} />
              </div>
            </Link>
          ))}

          <button onClick={() => setOpen(true)} className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
            <div className="mb-4 rounded-full bg-white p-4 text-intelligence-teal">
              <Sparkles size={24} />
            </div>
            <h3 className="headline-serif text-xl text-on-surface">Start a New Manuscript</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">Give Codex a premise and let the memory engine build with you from chapter one.</p>
          </button>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Stat icon={<FileText size={18} />} label="Live Stories" value={String(stories.length)} />
          <Stat icon={<Search size={18} />} label="Database" value="Postgres" />
          <Stat icon={<Sparkles size={18} />} label="Memory Engine" value="Ready" />
        </section>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4">
          <form onSubmit={createStory} className="w-full max-w-xl rounded-lg border border-memory-border bg-parchment-base p-6 soft-shadow">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="ui-label mb-2 text-intelligence-teal">New Story</p>
                <h2 className="headline-serif text-3xl text-primary">Start a manuscript</h2>
              </div>
              <button type="button" className="rounded-md p-2 text-on-surface-variant hover:bg-surface-container" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <label className="mb-4 block">
              <span className="ui-label mb-2 block text-on-surface-variant">Title</span>
              <input required name="title" className="w-full rounded-md border border-outline-variant bg-white px-3 py-3 outline-none focus:border-intelligence-teal" placeholder="The Obsidian Echo" />
            </label>
            <label className="mb-4 block">
              <span className="ui-label mb-2 block text-on-surface-variant">Initial Prompt</span>
              <textarea required name="initialPrompt" rows={5} className="w-full rounded-md border border-outline-variant bg-white px-3 py-3 outline-none focus:border-intelligence-teal" placeholder="A writer discovers that their story bible is changing the house around them..." />
            </label>
            <label className="mb-6 block">
              <span className="ui-label mb-2 block text-on-surface-variant">Genre / Tone Notes</span>
              <input name="genreToneNotes" className="w-full rounded-md border border-outline-variant bg-white px-3 py-3 outline-none focus:border-intelligence-teal" placeholder="Literary gothic mystery, atmospheric, close third" />
            </label>
            <Button variant="teal" className="w-full py-3" disabled={creating}>{creating ? "Creating..." : "Create Story"}</Button>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-memory-border bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-intelligence-teal">{icon}<span className="ui-label">{label}</span></div>
      <p className="headline-serif text-3xl text-primary">{value}</p>
    </div>
  );
}
