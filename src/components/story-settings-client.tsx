"use client";

import { Activity, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Button, MemoryCard } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";

type StoryRow = { id: string; title: string };
type StoryModelSettings = {
  chatModel: string;
  revisionModel: string;
  extractionModel: string;
  embeddingModel: string;
  generationTemperature: number;
  revisionTemperature: number;
  maxTokens: number;
};
type AiRun = {
  id: string;
  operation: string;
  model: string;
  status: string;
  fallbackUsed: boolean;
  durationMs: number | null;
  totalTokens: number | null;
  validationStatus: string | null;
  repaired: boolean | null;
  createdAt: string;
};

export function StorySettingsClient() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [storyId, setStoryId] = useState<string>("");
  const [settings, setSettings] = useState<StoryModelSettings | null>(null);
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    apiFetch<{ stories: StoryRow[] }>("/api/stories")
      .then((data) => {
        setStories(data.stories);
        setStoryId(data.stories[0]?.id ?? "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!storyId) return;
    const requestId = ++requestIdRef.current;
    setSettings(null);
    setRuns([]);
    setStatus(null);
    setError(null);
    Promise.all([
      apiFetch<{ settings: StoryModelSettings }>(`/api/stories/${storyId}/model-settings`),
      apiFetch<{ runs: AiRun[] }>(`/api/stories/${storyId}/ai-runs`)
    ])
      .then(([settingsResponse, runsResponse]) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setSettings(settingsResponse.settings);
        setRuns(runsResponse.runs);
      })
      .catch((err: Error) => {
        if (requestId === requestIdRef.current) {
          setError(err.message);
        }
      });
  }, [storyId]);

  const selectedStory = useMemo(() => stories.find((story) => story.id === storyId), [stories, storyId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storyId) return;

    const form = new FormData(event.currentTarget);
    setStatus("Saving...");
    setError(null);

    try {
      const response = await apiFetch<{ settings: StoryModelSettings }>(`/api/stories/${storyId}/model-settings`, {
        method: "PATCH",
        body: JSON.stringify({
          chatModel: String(form.get("chatModel") ?? ""),
          revisionModel: String(form.get("revisionModel") ?? ""),
          extractionModel: String(form.get("extractionModel") ?? ""),
          embeddingModel: String(form.get("embeddingModel") ?? ""),
          generationTemperature: Number(form.get("generationTemperature")),
          revisionTemperature: Number(form.get("revisionTemperature")),
          maxTokens: Number(form.get("maxTokens"))
        })
      });
      setSettings(response.settings);
      setStatus("Saved");
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Could not save settings");
    }
  }

  return (
    <div className="mb-6 grid gap-4">
      <MemoryCard title="Story Models">
        {stories.length > 0 ? (
          <label className="mb-4 block">
            <span className="ui-label mb-2 block text-on-surface-variant">Story</span>
            <select value={storyId} onChange={(event) => setStoryId(event.target.value)} className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 outline-none focus:border-intelligence-teal">
              {stories.map((story) => <option key={story.id} value={story.id}>{story.title}</option>)}
            </select>
          </label>
        ) : <p>No stories yet.</p>}

        {settings ? (
          <form key={storyId} onSubmit={save} className="grid gap-3">
            <Field name="chatModel" label="Generation Model" defaultValue={settings.chatModel} />
            <Field name="revisionModel" label="Revision Model" defaultValue={settings.revisionModel} />
            <Field name="extractionModel" label="Extraction Model" defaultValue={settings.extractionModel} />
            <Field name="embeddingModel" label="Embedding Model" defaultValue={settings.embeddingModel} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field name="generationTemperature" label="Generation Temp" defaultValue={String(settings.generationTemperature)} type="number" step="0.1" min="0" max="2" />
              <Field name="revisionTemperature" label="Revision Temp" defaultValue={String(settings.revisionTemperature)} type="number" step="0.1" min="0" max="2" />
              <Field name="maxTokens" label="Max Tokens" defaultValue={String(settings.maxTokens)} type="number" min="256" max="32000" />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="teal"><Save size={16} />Save Models</Button>
              {status ? <span className="text-xs font-bold text-intelligence-teal">{status}</span> : null}
            </div>
          </form>
        ) : null}

        {error ? <p className="mt-3 font-bold text-red-700">{error}</p> : null}
      </MemoryCard>

      <MemoryCard title={`AI Runs${selectedStory ? ` / ${selectedStory.title}` : ""}`}>
        <div className="space-y-2">
          {runs.length === 0 ? <p>No AI runs recorded for this story yet.</p> : runs.map((run) => (
            <div key={run.id} className="grid gap-2 rounded-md border border-outline-variant p-3 text-xs md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="flex items-center gap-2 font-bold text-on-surface"><Activity size={14} />{run.operation.replaceAll("_", " ")}</p>
                <p className="mt-1 text-on-surface-variant">{run.model}</p>
              </div>
              <div className="flex flex-wrap gap-2 font-bold uppercase text-on-surface-variant">
                <span>{run.status}</span>
                {run.fallbackUsed ? <span>Fallback</span> : null}
                {run.totalTokens ? <span>{run.totalTokens} tokens</span> : null}
                {run.durationMs ? <span>{run.durationMs}ms</span> : null}
                {run.validationStatus ? <span>{run.validationStatus}</span> : null}
                {run.repaired ? <span>Repaired</span> : null}
              </div>
            </div>
          ))}
        </div>
      </MemoryCard>
    </div>
  );
}

function Field(props: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="ui-label mb-1 block text-on-surface-variant">{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        step={props.step}
        min={props.min}
        max={props.max}
        defaultValue={props.defaultValue}
        className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 outline-none focus:border-intelligence-teal"
      />
    </label>
  );
}
