"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, BookOpen, Check, Download, Filter, Image as ImageIcon, Loader2, Lock, MapPin, Plus, Search, Sparkles, Upload, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";

import { AppShell } from "@/components/app-shell";
import { Button, MemoryCard, SectionHeading } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import type { CharacterProfile, ImageGenerationBrief } from "@/lib/characters/schema";
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
  characterProfiles: CharacterProfileRow[];
  characterCandidates: CharacterCandidateRow[];
  memoryItems: MemoryRow[];
  lastUpdatedFromChapterNumber: number;
};

type CharacterImageAsset = {
  id: string;
  uri: string;
  type: string;
  mediaType: string;
  prompt?: string | null;
  seed?: string | null;
  isPrimary: boolean;
  isCanonical: boolean;
  extractedVisualDetails?: Record<string, unknown>;
  createdAt: string;
};

type CharacterFieldSource = {
  id: string;
  fieldPath: string;
  value: string;
  sourceType: string;
  confidence?: string | null;
  canonStatus: string;
};

type CharacterProfileRow = {
  id: string;
  name: string;
  displayName?: string | null;
  importance: string;
  status: string;
  canonLevel: string;
  profile: CharacterProfile;
  primaryImageAssetId?: string | null;
  imageAssets: CharacterImageAsset[];
  fieldSources: CharacterFieldSource[];
};

type CharacterCandidateRow = {
  id: string;
  possibleName: string;
  confidence: string;
  status: string;
  evidence: Record<string, unknown>;
  suggestedProfile: Record<string, unknown>;
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
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [visualRequest, setVisualRequest] = useState("");
  const [imageBrief, setImageBrief] = useState<ImageGenerationBrief | null>(null);
  const [characterBusy, setCharacterBusy] = useState<string | null>(null);
  const [characterNotice, setCharacterNotice] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const storyRequestRef = useRef(0);
  const bibleRequestRef = useRef(0);

  const tab = tabs.find((item) => item.label === activeTab) ?? tabs[0];
  const category = tab.categories.length === 1 ? tab.categories[0] : "";

  useEffect(() => {
    async function resolveStory() {
      const requestId = ++storyRequestRef.current;
      setLoading(true);
      setError(null);
      try {
        if (requestedStoryId) {
          const response = await apiFetch<{ story: StorySummary }>(`/api/stories/${requestedStoryId}`);
          if (requestId === storyRequestRef.current) setStory(response.story);
          return;
        }

        if (requestedChapterId) {
          const response = await apiFetch<{ story: StorySummary }>(`/api/chapters/${requestedChapterId}`);
          if (requestId === storyRequestRef.current) setStory(response.story);
          return;
        }

        const response = await apiFetch<{ stories: StorySummary[] }>("/api/stories");
        if (requestId === storyRequestRef.current) setStory(response.stories[0] ?? null);
      } catch (err) {
        if (requestId === storyRequestRef.current) setError(err instanceof Error ? err.message : "Could not load story");
      } finally {
        if (requestId === storyRequestRef.current) setLoading(false);
      }
    }

    resolveStory();
  }, [reloadKey, requestedChapterId, requestedStoryId]);

  useEffect(() => {
    if (!story?.id) {
      setData(null);
      return;
    }

    const requestId = ++bibleRequestRef.current;
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
        if (requestId === bibleRequestRef.current) setData(response);
      } catch (err) {
        if (requestId === bibleRequestRef.current) setError(err instanceof Error ? err.message : "Could not load Story Bible");
      } finally {
        if (requestId === bibleRequestRef.current) setLoading(false);
      }
    }, query ? 250 : 0);

    return () => window.clearTimeout(timeout);
  }, [reloadKey, story?.id, category, importance, query]);

  const rows = data?.memoryItems ?? [];
  const displayRows = hasUsableMemory(data, rows) ? rows : [];
  const character = data?.characters[0] ?? null;
  const characterProfiles = data?.characterProfiles ?? [];
  const selectedCharacter = characterProfiles.find((item) => item.id === selectedCharacterId) ?? characterProfiles[0] ?? null;
  const pendingCandidates = (data?.characterCandidates ?? []).filter((candidate) => candidate.status === "pending");
  const openThreads = data?.openThreads ?? [];
  const warnings = data?.warnings ?? [];
  const hasLiveData = Boolean(data?.bible || rows.length > 0);

  const contextCopy = useMemo(() => {
    if (!story) return "Create a story and commit chapter memory to build a live Story Bible.";
    if (!hasLiveData) return "No committed memory yet. Extract and approve chapter memory to populate this explorer.";
    return `Live memory from ${story.title}. Last updated through chapter ${data?.lastUpdatedFromChapterNumber ?? 0}.`;
  }, [data?.lastUpdatedFromChapterNumber, hasLiveData, story]);

  useEffect(() => {
    if (!selectedCharacterId && characterProfiles[0]) {
      setSelectedCharacterId(characterProfiles[0].id);
    }
  }, [characterProfiles, selectedCharacterId]);

  async function createCharacterFromName() {
    if (!story?.id || !newCharacterName.trim()) return;
    setCharacterBusy("create");
    setError(null);
    try {
      const response = await apiFetch<{ character: CharacterProfileRow }>(`/api/stories/${story.id}/characters`, {
        method: "POST",
        body: JSON.stringify({ name: newCharacterName.trim(), createdFrom: "manual" })
      });
      setNewCharacterName("");
      setSelectedCharacterId(response.character.id);
      setReloadKey((key) => key + 1);
      setCharacterNotice("Character created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create character");
    } finally {
      setCharacterBusy(null);
    }
  }

  async function candidateAction(candidateId: string, action: "add" | "ignore" | "background") {
    if (!story?.id) return;
    setCharacterBusy(`candidate:${candidateId}`);
    setError(null);
    try {
      const response = await apiFetch<{ character?: CharacterProfileRow }>(`/api/stories/${story.id}/character-candidates/${candidateId}`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      if (response.character?.id) setSelectedCharacterId(response.character.id);
      setReloadKey((key) => key + 1);
      setCharacterNotice(action === "add" ? "Candidate added as a character." : "Candidate reviewed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not review candidate");
    } finally {
      setCharacterBusy(null);
    }
  }

  async function buildBrief(characterId: string, previousPrompt?: string) {
    if (!story?.id) return;
    setCharacterBusy("brief");
    setError(null);
    try {
      const response = await apiFetch<{ brief: ImageGenerationBrief }>(`/api/stories/${story.id}/characters/${characterId}/image-brief`, {
        method: "POST",
        body: JSON.stringify({ userRequest: visualRequest, previousPrompt })
      });
      setImageBrief(response.brief);
      setCharacterNotice("Image brief ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build image brief");
    } finally {
      setCharacterBusy(null);
    }
  }

  async function generateImages(characterId: string) {
    if (!story?.id || !imageBrief) return;
    setCharacterBusy("generate-image");
    setError(null);
    try {
      await apiFetch(`/api/stories/${story.id}/characters/${characterId}/images/generate`, {
        method: "POST",
        body: JSON.stringify({ brief: imageBrief, n: 2, aspectRatio: "3:4" })
      });
      setReloadKey((key) => key + 1);
      setCharacterNotice("Image iteration generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate image");
    } finally {
      setCharacterBusy(null);
    }
  }

  async function uploadImage(characterId: string, file: File | null | undefined) {
    if (!story?.id || !file) return;
    setCharacterBusy("upload");
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      await apiFetch(`/api/stories/${story.id}/characters/${characterId}/images/upload`, {
        method: "POST",
        body: form
      });
      setReloadKey((key) => key + 1);
      setCharacterNotice("Image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setCharacterBusy(null);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function analyzeImage(characterId: string, assetId: string) {
    if (!story?.id) return;
    setCharacterBusy(`analyze:${assetId}`);
    setError(null);
    try {
      await apiFetch(`/api/stories/${story.id}/characters/${characterId}/images/${assetId}/analyze`, { method: "POST" });
      setReloadKey((key) => key + 1);
      setCharacterNotice("Visual details extracted for review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze image");
    } finally {
      setCharacterBusy(null);
    }
  }

  async function markCanonical(characterId: string, assetId: string, acceptVisualExtraction: boolean) {
    if (!story?.id) return;
    setCharacterBusy(`canonical:${assetId}`);
    setError(null);
    try {
      await apiFetch(`/api/stories/${story.id}/characters/${characterId}/images/${assetId}/canonical`, {
        method: "POST",
        body: JSON.stringify({ acceptVisualExtraction })
      });
      setReloadKey((key) => key + 1);
      setCharacterNotice(acceptVisualExtraction ? "Canonical image and visual details accepted." : "Canonical image selected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark canonical image");
    } finally {
      setCharacterBusy(null);
    }
  }

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

        {story && activeTab === "Characters" ? (
          <CharacterWorkspace
            characters={characterProfiles}
            selectedCharacter={selectedCharacter}
            candidates={pendingCandidates}
            busy={characterBusy}
            notice={characterNotice}
            newCharacterName={newCharacterName}
            visualRequest={visualRequest}
            imageBrief={imageBrief}
            uploadRef={uploadRef}
            onSelectCharacter={setSelectedCharacterId}
            onNewCharacterName={setNewCharacterName}
            onVisualRequest={setVisualRequest}
            onCreateCharacter={createCharacterFromName}
            onCandidateAction={candidateAction}
            onBuildBrief={buildBrief}
            onGenerateImages={generateImages}
            onUploadImage={uploadImage}
            onAnalyzeImage={analyzeImage}
            onMarkCanonical={markCanonical}
          />
        ) : null}

        {story && activeTab !== "Characters" ? <div className="grid gap-6 lg:grid-cols-12">
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

function CharacterWorkspace({
  characters,
  selectedCharacter,
  candidates,
  busy,
  notice,
  newCharacterName,
  visualRequest,
  imageBrief,
  uploadRef,
  onSelectCharacter,
  onNewCharacterName,
  onVisualRequest,
  onCreateCharacter,
  onCandidateAction,
  onBuildBrief,
  onGenerateImages,
  onUploadImage,
  onAnalyzeImage,
  onMarkCanonical
}: {
  characters: CharacterProfileRow[];
  selectedCharacter: CharacterProfileRow | null;
  candidates: CharacterCandidateRow[];
  busy: string | null;
  notice: string | null;
  newCharacterName: string;
  visualRequest: string;
  imageBrief: ImageGenerationBrief | null;
  uploadRef: RefObject<HTMLInputElement | null>;
  onSelectCharacter: (id: string) => void;
  onNewCharacterName: (value: string) => void;
  onVisualRequest: (value: string) => void;
  onCreateCharacter: () => void;
  onCandidateAction: (candidateId: string, action: "add" | "ignore" | "background") => void;
  onBuildBrief: (characterId: string, previousPrompt?: string) => void;
  onGenerateImages: (characterId: string) => void;
  onUploadImage: (characterId: string, file: File | null | undefined) => void;
  onAnalyzeImage: (characterId: string, assetId: string) => void;
  onMarkCanonical: (characterId: string, assetId: string, acceptVisualExtraction: boolean) => void;
}) {
  const profile = selectedCharacter?.profile;
  const primaryAsset = selectedCharacter?.imageAssets.find((asset) => asset.id === selectedCharacter.primaryImageAssetId) ?? selectedCharacter?.imageAssets.find((asset) => asset.isPrimary);
  const latestAsset = selectedCharacter?.imageAssets[0];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <aside className="space-y-5 lg:col-span-3">
        <div className="rounded-md border border-memory-border bg-white p-4">
          <SectionHeading icon={<Users size={16} />} title="Characters" />
          <div className="mb-4 flex gap-2">
            <input
              value={newCharacterName}
              onChange={(event) => onNewCharacterName(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-intelligence-teal"
              placeholder="New character name"
            />
            <Button variant="teal" onClick={onCreateCharacter} disabled={busy === "create" || !newCharacterName.trim()}>
              {busy === "create" ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            </Button>
          </div>
          <div className="space-y-2">
            {characters.length > 0 ? characters.map((character) => (
              <button
                key={character.id}
                type="button"
                onClick={() => onSelectCharacter(character.id)}
                className={character.id === selectedCharacter?.id ? "w-full rounded-md border border-intelligence-teal bg-intelligence-glow p-3 text-left" : "w-full rounded-md border border-outline-variant bg-surface-container-lowest p-3 text-left hover:border-intelligence-teal"}
              >
                <p className="font-bold text-primary">{character.profile.displayName || character.name}</p>
                <p className="mt-1 text-xs uppercase text-on-surface-variant">{character.importance} / {character.canonLevel}</p>
              </button>
            )) : <p className="rounded-md border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">No character profiles yet.</p>}
          </div>
        </div>

        <div className="rounded-md border border-memory-border bg-white p-4">
          <SectionHeading icon={<UserPlus size={16} />} title="Detected Characters" />
          <div className="space-y-3">
            {candidates.length > 0 ? candidates.map((candidate) => (
              <div key={candidate.id} className="rounded-md border border-outline-variant bg-surface-container-lowest p-3">
                <p className="font-bold text-primary">{candidate.possibleName}</p>
                <p className="mt-1 text-xs uppercase text-on-surface-variant">{candidate.confidence} confidence</p>
                <p className="mt-2 line-clamp-3 text-sm text-on-surface-variant">{candidateEvidence(candidate)}</p>
                <div className="mt-3 grid gap-2">
                  <Button variant="teal" onClick={() => onCandidateAction(candidate.id, "add")} disabled={busy === `candidate:${candidate.id}`}>
                    <UserPlus size={15} />Add
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => onCandidateAction(candidate.id, "background")} disabled={busy === `candidate:${candidate.id}`}>Background</Button>
                    <Button variant="secondary" onClick={() => onCandidateAction(candidate.id, "ignore")} disabled={busy === `candidate:${candidate.id}`}><X size={14} />Ignore</Button>
                  </div>
                </div>
              </div>
            )) : <p className="text-sm text-on-surface-variant">No pending character detections.</p>}
          </div>
        </div>
      </aside>

      <section className="space-y-5 lg:col-span-6">
        {selectedCharacter && profile ? (
          <>
            <div className="rounded-md border border-memory-border bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="w-full md:w-48">
                  <div className="aspect-[3/4] overflow-hidden rounded-md border border-outline-variant bg-surface-container-low">
                    {primaryAsset ? <img src={primaryAsset.uri} alt={profile.name} className="h-full w-full object-cover" /> : (
                      <div className="flex h-full items-center justify-center text-on-surface-variant"><ImageIcon size={32} /></div>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="ui-label mb-2 text-intelligence-teal">Character Profile</p>
                  <h3 className="headline-serif text-3xl text-primary">{profile.displayName || profile.name}</h3>
                  <p className="mt-2 text-sm uppercase text-on-surface-variant">{profile.importance} / {profile.status} / {profile.canonLevel}</p>
                  <p className="mt-4 text-lg leading-7 text-on-surface">{profile.storyFunction.roleInStory || profile.storyFunction.narrativePurpose || "No story role confirmed yet."}</p>
                  {notice ? <p className="mt-3 text-sm font-bold text-intelligence-teal">{notice}</p> : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ProfilePanel title="Visual Design" icon={<ImageIcon size={16} />}>
                <Fact label="Summary" value={profile.visualDesign.canonicalSummary || "No canonical visual summary yet."} />
                <Fact label="Locked Details" value={profile.visualDesign.doNotChange.join(", ") || "No locked visual details yet."} />
                <Fact label="Flexible Details" value={profile.visualDesign.flexibleVisualDetails.join(", ") || "Pose, expression, lighting, and scene-specific clothing can vary."} />
              </ProfilePanel>
              <ProfilePanel title="Current State" icon={<MapPin size={16} />}>
                <Fact label="Location" value={profile.currentStoryState.currentLocation || "Unknown"} />
                <Fact label="Physical" value={profile.currentStoryState.physicalState || "Unknown"} />
                <Fact label="Emotional" value={profile.currentStoryState.emotionalState || "Unknown"} />
              </ProfilePanel>
              <ProfilePanel title="Personality" icon={<Check size={16} />}>
                <Fact label="Summary" value={profile.personality.summary || profile.personality.traits.join(", ") || "No confirmed personality notes yet."} />
                <Fact label="Flaws" value={profile.personality.flaws.join(", ") || "None confirmed."} />
              </ProfilePanel>
              <ProfilePanel title="Voice" icon={<BookOpen size={16} />}>
                <Fact label="Dialogue" value={profile.voice.dialogueStyle || "No voice notes yet."} />
                <Fact label="Avoid" value={profile.voice.thingsTheyAvoidSaying.join(", ") || "No constraints yet."} />
              </ProfilePanel>
            </div>

            <div className="rounded-md border border-memory-border bg-white p-5">
              <SectionHeading icon={<AlertTriangle size={16} />} title="Continuity" />
              <div className="grid gap-4 md:grid-cols-3">
                <Fact label="Must Remember" value={profile.continuity.mustRemember.join(" ") || "No reminders yet."} />
                <Fact label="Must Not Contradict" value={profile.continuity.mustNotContradict.join(" ") || "No constraints yet."} />
                <Fact label="Must Not Reveal Yet" value={profile.continuity.mustNotRevealYet.join(" ") || "No hidden reveals tracked yet."} />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-outline-variant bg-surface-container-low p-8 text-center text-on-surface-variant">
            Create or approve a character to open the profile workspace.
          </div>
        )}
      </section>

      <aside className="space-y-5 lg:col-span-3">
        {selectedCharacter && profile ? (
          <>
            <div className="rounded-md border border-memory-border bg-white p-4">
              <SectionHeading icon={<Sparkles size={16} />} title="Visual Identity Lab" />
              <textarea
                value={visualRequest}
                onChange={(event) => onVisualRequest(event.target.value)}
                className="h-28 w-full resize-none rounded-md border border-outline-variant bg-surface-container-lowest p-3 text-sm outline-none focus:border-intelligence-teal"
                placeholder="Describe a visual direction or refinement..."
              />
              <div className="mt-3 grid gap-2">
                <Button variant="secondary" onClick={() => onBuildBrief(selectedCharacter.id, latestAsset?.prompt ?? undefined)} disabled={busy === "brief"}>
                  {busy === "brief" ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  Build Brief
                </Button>
                <Button variant="teal" onClick={() => onGenerateImages(selectedCharacter.id)} disabled={!imageBrief || busy === "generate-image"}>
                  {busy === "generate-image" ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                  Generate Iterations
                </Button>
                <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(event) => onUploadImage(selectedCharacter.id, event.target.files?.[0])} />
                <Button variant="secondary" onClick={() => uploadRef.current?.click()} disabled={busy === "upload"}>
                  <Upload size={16} />Upload Image
                </Button>
              </div>
              {imageBrief ? (
                <div className="mt-4 rounded-md border border-outline-variant bg-surface-container-lowest p-3 text-xs leading-5 text-on-surface-variant">
                  <p className="font-bold text-primary">{imageBrief.characterName || profile.name}</p>
                  <p className="mt-2">{imageBrief.imagePrompt}</p>
                  {imageBrief.mustPreserve.length > 0 ? <p className="mt-2 flex items-center gap-1 font-bold text-intelligence-teal"><Lock size={13} />{imageBrief.mustPreserve.join(", ")}</p> : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-md border border-memory-border bg-white p-4">
              <SectionHeading icon={<ImageIcon size={16} />} title="Image Assets" />
              <div className="space-y-3">
                {selectedCharacter.imageAssets.length > 0 ? selectedCharacter.imageAssets.map((asset) => {
                  const hasExtraction = Boolean(asset.extractedVisualDetails && Object.keys(asset.extractedVisualDetails).length > 0);
                  return (
                    <div key={asset.id} className="rounded-md border border-outline-variant bg-surface-container-lowest p-2">
                      <div className="aspect-[4/3] overflow-hidden rounded border border-outline-variant bg-surface-container">
                        <img src={asset.uri} alt={`${profile.name} asset`} className="h-full w-full object-cover" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className="rounded-md border border-outline-variant px-2 py-1 text-xs font-bold text-on-surface-variant hover:border-intelligence-teal" onClick={() => onAnalyzeImage(selectedCharacter.id, asset.id)} disabled={busy === `analyze:${asset.id}`}>
                          Analyze
                        </button>
                        <button className="rounded-md border border-intelligence-teal px-2 py-1 text-xs font-bold text-intelligence-teal" onClick={() => onMarkCanonical(selectedCharacter.id, asset.id, hasExtraction)} disabled={busy === `canonical:${asset.id}`}>
                          {asset.isCanonical ? "Canonical" : "Mark Canonical"}
                        </button>
                        <a href={asset.uri} download className="rounded-md border border-outline-variant px-2 py-1 text-xs font-bold text-on-surface-variant"><Download size={13} /></a>
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-on-surface-variant">No images yet. Generate or upload one to begin visual identity work.</p>}
              </div>
            </div>

            <div className="rounded-md border border-memory-border bg-white p-4">
              <SectionHeading title="Evidence Log" />
              <div className="space-y-2 text-xs">
                {selectedCharacter.fieldSources.length > 0 ? selectedCharacter.fieldSources.slice(0, 8).map((source) => (
                  <div key={source.id} className="rounded-md border border-outline-variant bg-surface-container-lowest p-2">
                    <p className="font-bold text-primary">{source.fieldPath}</p>
                    <p className="text-on-surface-variant">{source.value}</p>
                    <p className="mt-1 uppercase text-intelligence-teal">{source.sourceType} / {source.canonStatus}</p>
                  </div>
                )) : <p className="text-sm text-on-surface-variant">No field sources recorded yet.</p>}
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function ProfilePanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-memory-border bg-white p-5">
      <SectionHeading icon={icon} title={title} />
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function candidateEvidence(candidate: CharacterCandidateRow) {
  const evidence = candidate.evidence ?? {};
  return String(
    evidence.firstAppearanceSummary ??
    evidence.first_appearance_summary ??
    evidence.dialogueOrVoiceNotes ??
    evidence.dialogue_or_voice_notes ??
    evidence.appearanceDescribed ??
    evidence.appearance_described ??
    candidate.suggestedProfile.story_function ??
    "Review the extracted scene evidence before adding this character."
  );
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
