"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, FileJson, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { Button, SectionHeading } from "@/components/ui";
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

type FoundationStep = "identity" | "genre" | "style" | "plan";

const foundationSteps: Array<{ id: FoundationStep; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "genre", label: "Genre" },
  { id: "style", label: "Style" },
  { id: "plan", label: "Plan" }
];

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
  const [activeStep, setActiveStep] = useState<FoundationStep>("identity");
  const [showJson, setShowJson] = useState(false);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

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
    setJsonParseError(null);
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
      setJsonParseError(null);
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
      setJsonParseError(null);
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

  function updateFoundation(mutator: (foundation: StoryFoundation) => void) {
    if (!foundation) return;
    if (jsonParseError) {
      setError("Fix the Advanced JSON before editing structured fields.");
      return;
    }

    const next = JSON.parse(JSON.stringify(foundation)) as StoryFoundation;
    mutator(next);
    setJsonText(JSON.stringify(next, null, 2));
    setData((current) => current ? { ...current, foundation: next } : current);
  }

  const currentStepIndex = foundationSteps.findIndex((step) => step.id === activeStep);
  const previousStep = foundationSteps[currentStepIndex - 1]?.id;
  const nextStep = foundationSteps[currentStepIndex + 1]?.id;

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
      <div className="foundation-screen mx-auto max-w-7xl px-5 py-10 md:px-8">
        {!storyId && !chapterId ? (
          <section className="rounded-md border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center">
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
                <Button variant="secondary" onClick={saveFoundation} disabled={Boolean(busy) || Boolean(jsonParseError)}><Save size={16} />Save Draft</Button>
                <Button variant="teal" onClick={approveFoundation} disabled={Boolean(busy) || Boolean(jsonParseError)}><CheckCircle2 size={16} />Approve and Start Writing</Button>
              </div>
            </section>

            {error ? <div className="foundation-error mb-5 rounded-md border p-3 text-sm font-bold">{error}</div> : null}
            {message ? <div className="foundation-success mb-5 rounded-md border p-3 text-sm font-bold">{message}</div> : null}

            {foundation ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="min-w-0">
                  <div className="foundation-panel mb-8 rounded-md border border-memory-border bg-surface-container-lowest p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase text-intelligence-teal">Step {currentStepIndex + 1} of {foundationSteps.length}</p>
                        <h3 className="headline-serif mt-1 text-2xl text-primary">{foundationSteps[currentStepIndex]?.label} Foundation</h3>
                      </div>
                      <div className="hidden min-w-32 items-center gap-2 text-xs font-bold uppercase text-on-surface-variant sm:flex">
                        <span>{Math.round(((currentStepIndex + 1) / foundationSteps.length) * 100)}%</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                          <div className="h-full bg-intelligence-teal" style={{ width: `${((currentStepIndex + 1) / foundationSteps.length) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    <FoundationStepper activeStep={activeStep} onStep={setActiveStep} />
                  </div>

                  <div className="foundation-panel rounded-md border border-memory-border bg-surface-container-lowest p-5 md:p-8">
                    <StepIntro step={activeStep} />
                    <FoundationStepFields foundation={foundation} step={activeStep} updateFoundation={updateFoundation} />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 border-t border-outline-variant pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="ghost" onClick={() => previousStep && setActiveStep(previousStep)} disabled={!previousStep}>
                      <ArrowLeft size={16} />
                      Back
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setShowJson((open) => !open)}><FileJson size={16} />{showJson ? "Hide JSON" : "Advanced JSON"}</Button>
                      {nextStep ? (
                        <Button variant="teal" onClick={() => setActiveStep(nextStep)}>Next: {foundationSteps[currentStepIndex + 1]?.label}<ArrowRight size={16} /></Button>
                      ) : (
                        <Button variant="teal" onClick={approveFoundation} disabled={Boolean(busy) || Boolean(jsonParseError)}><CheckCircle2 size={16} />Approve and Start Writing</Button>
                      )}
                    </div>
                  </div>

                  {showJson ? (
                    <section className="mt-8">
                      <SectionHeading icon={<FileJson size={16} />} title="Advanced Structured Plan" />
                      <textarea
                        value={jsonText}
                        onChange={(event) => {
                          const value = event.target.value;
                          setJsonText(value);
                          try {
                            if (value.trim()) JSON.parse(value);
                            setJsonParseError(null);
                          } catch {
                            setJsonParseError("Advanced JSON is invalid. Structured fields and saving are paused until it parses.");
                          }
                        }}
                        spellCheck={false}
                        className="foundation-json-editor min-h-[520px] w-full rounded-md border border-outline-variant bg-surface-container-lowest p-4 font-mono text-xs leading-5 text-on-surface outline-none focus:border-intelligence-teal"
                      />
                      {jsonParseError ? <p className="mt-2 text-sm font-bold text-red-700">{jsonParseError}</p> : null}
                    </section>
                  ) : null}
                </section>

                <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                  <FoundationStatusCard status={data?.status ?? "draft"} updatedAt={data?.updatedAt ?? null} />
                  <SuggestionRail foundation={foundation} activeStep={activeStep} />
                </aside>
              </div>
            ) : (
              <section className="rounded-md border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center">
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

function FoundationStepper({ activeStep, onStep }: { activeStep: FoundationStep; onStep: (step: FoundationStep) => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      {foundationSteps.map((step, index) => {
        const active = step.id === activeStep;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStep(step.id)}
            className={active ? "foundation-step-active rounded-md border border-intelligence-teal bg-intelligence-glow p-3 text-left" : "rounded-md border border-outline-variant bg-surface-container-low p-3 text-left hover:bg-surface-container-lowest"}
          >
            <span className={active ? "mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-intelligence-teal text-xs font-bold text-on-primary" : "mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant text-xs font-bold text-on-surface-variant"}>{index + 1}</span>
            <span className={active ? "block text-sm font-bold text-primary" : "block text-sm font-bold text-on-surface-variant"}>{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StepIntro({ step }: { step: FoundationStep }) {
  const copy: Record<FoundationStep, { title: string; body: string }> = {
    identity: {
      title: "Define Your Story's Foundation",
      body: "Lock the premise, hook, central question, and reader promise before Chapter 1 starts drafting."
    },
    genre: {
      title: "Set Reader Expectations",
      body: "Tune genre, audience, and boundaries so the story knows what kind of satisfaction it is promising."
    },
    style: {
      title: "Shape the Voice",
      body: "Capture POV, tense, narrative distance, prose texture, pacing, and the habits the writing should preserve."
    },
    plan: {
      title: "Prepare the Opening Move",
      body: "Give Chapter 1 a useful brief while keeping the plan flexible enough for later canon to override it."
    }
  };

  return (
    <div className="mb-8 max-w-3xl">
      <h3 className="headline-serif text-3xl text-primary">{copy[step].title}</h3>
      <p className="mt-2 text-lg leading-8 text-on-surface-variant">{copy[step].body}</p>
    </div>
  );
}

function FoundationStepFields({
  foundation,
  step,
  updateFoundation
}: {
  foundation: StoryFoundation;
  step: FoundationStep;
  updateFoundation: (mutator: (foundation: StoryFoundation) => void) => void;
}) {
  if (step === "identity") {
    return (
      <FieldGrid>
        <TextField label="Working Title" value={foundation.metadata.workingTitle} large onChange={(value) => updateFoundation((draft) => {
          draft.metadata.workingTitle = value;
        })} />
        <TextField label="Premise" hint="The basic idea of your story: characters, setting, and conflict in a broad sense." value={foundation.coreConcept.premise} multiline rows={4} onChange={(value) => updateFoundation((draft) => {
          draft.coreConcept.premise = value;
        })} />
        <TextField label="Logline" value={foundation.coreConcept.logline} onChange={(value) => updateFoundation((draft) => {
          draft.coreConcept.logline = value;
        })} />
        <TextField label="Core Hook" value={foundation.coreConcept.coreHook} onChange={(value) => updateFoundation((draft) => {
          draft.coreConcept.coreHook = value;
        })} />
        <TextField label="Story Question" value={foundation.coreConcept.storyQuestion} onChange={(value) => updateFoundation((draft) => {
          draft.coreConcept.storyQuestion = value;
        })} />
        <TextField label="Reader Promise" value={foundation.coreConcept.readerPromise} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.coreConcept.readerPromise = value;
        })} />
        <TextField label="Target Reader Experience" value={foundation.coreConcept.targetReaderExperience} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.coreConcept.targetReaderExperience = value;
        })} />
      </FieldGrid>
    );
  }

  if (step === "genre") {
    return (
      <FieldGrid>
        <TextField label="Primary Genre" value={foundation.genre.primaryGenre} onChange={(value) => updateFoundation((draft) => {
          draft.genre.primaryGenre = value;
        })} />
        <TextField label="Genre Blend" value={foundation.genre.genreBlend} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.genre.genreBlend = value;
        })} />
        <ArrayField label="Secondary Genres" values={foundation.genre.secondaryGenres} onChange={(values) => updateFoundation((draft) => {
          draft.genre.secondaryGenres = values;
        })} />
        <ArrayField label="Subgenres" values={foundation.genre.subgenres} onChange={(values) => updateFoundation((draft) => {
          draft.genre.subgenres = values;
        })} />
        <ArrayField label="Conventions to Honor" values={foundation.genre.genreConventionsToHonor} onChange={(values) => updateFoundation((draft) => {
          draft.genre.genreConventionsToHonor = values;
        })} />
        <ArrayField label="Conventions to Subvert" values={foundation.genre.genreConventionsToSubvert} onChange={(values) => updateFoundation((draft) => {
          draft.genre.genreConventionsToSubvert = values;
        })} />
        <ArrayField label="Genre No-Goes" values={foundation.genre.genreNoGoes} onChange={(values) => updateFoundation((draft) => {
          draft.genre.genreNoGoes = values;
        })} />
        <TextField label="Target Audience" value={foundation.audienceAndBoundaries.targetAudience} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.audienceAndBoundaries.targetAudience = value;
        })} />
        <TextField label="Content Rating" value={foundation.audienceAndBoundaries.contentRating} onChange={(value) => updateFoundation((draft) => {
          draft.audienceAndBoundaries.contentRating = value;
        })} />
        <ArrayField label="Hard Exclusions" values={foundation.audienceAndBoundaries.hardExclusions} onChange={(values) => updateFoundation((draft) => {
          draft.audienceAndBoundaries.hardExclusions = values;
        })} />
      </FieldGrid>
    );
  }

  if (step === "style") {
    return (
      <FieldGrid>
        <TextField label="POV" value={foundation.styleGuide.pov} onChange={(value) => updateFoundation((draft) => {
          draft.styleGuide.pov = value;
        })} />
        <TextField label="Tense" value={foundation.styleGuide.tense} onChange={(value) => updateFoundation((draft) => {
          draft.styleGuide.tense = value;
        })} />
        <TextField label="Narrative Distance" value={foundation.styleGuide.narrativeDistance} onChange={(value) => updateFoundation((draft) => {
          draft.styleGuide.narrativeDistance = value;
        })} />
        <TextField label="POV Rules" value={foundation.styleGuide.povRules} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.styleGuide.povRules = value;
        })} />
        <TextField label="Narrative Voice" value={foundation.styleGuide.narrativeVoice} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.styleGuide.narrativeVoice = value;
        })} />
        <TextField label="Prose Style" value={foundation.styleGuide.proseStyle} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.styleGuide.proseStyle = value;
        })} />
        <TextField label="Dialogue Style" value={foundation.styleGuide.dialogueStyle} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.styleGuide.dialogueStyle = value;
        })} />
        <TextField label="Pacing Style" value={foundation.styleGuide.pacingStyle} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
          draft.styleGuide.pacingStyle = value;
        })} />
        <ArrayField label="Style Do" values={foundation.styleGuide.styleDo} onChange={(values) => updateFoundation((draft) => {
          draft.styleGuide.styleDo = values;
        })} />
        <ArrayField label="Style Do Not" values={foundation.styleGuide.styleDoNot} onChange={(values) => updateFoundation((draft) => {
          draft.styleGuide.styleDoNot = values;
        })} />
      </FieldGrid>
    );
  }

  return (
    <FieldGrid>
      <TextField label="Chapter 1 Purpose" value={foundation.chapter1Brief.purpose} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
        draft.chapter1Brief.purpose = value;
      })} />
      <TextField label="Opening Image or Situation" value={foundation.chapter1Brief.openingImageOrSituation} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
        draft.chapter1Brief.openingImageOrSituation = value;
      })} />
      <TextField label="Ending Hook" value={foundation.chapter1Brief.endingHook} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
        draft.chapter1Brief.endingHook = value;
      })} />
      <ArrayField label="Required Events" values={foundation.chapter1Brief.requiredEvents} onChange={(values) => updateFoundation((draft) => {
        draft.chapter1Brief.requiredEvents = values;
      })} />
      <ArrayField label="Required Reveals" values={foundation.chapter1Brief.requiredReveals} onChange={(values) => updateFoundation((draft) => {
        draft.chapter1Brief.requiredReveals = values;
      })} />
      <ArrayField label="Things to Withhold" values={foundation.chapter1Brief.thingsToWithhold} onChange={(values) => updateFoundation((draft) => {
        draft.chapter1Brief.thingsToWithhold = values;
      })} />
      <TextField label="Default Chapter Instruction" value={foundation.generationDefaults.defaultChapterInstruction} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
        draft.generationDefaults.defaultChapterInstruction = value;
      })} />
      <TextField label="Continuity Priority" value={foundation.generationDefaults.continuityPriority} multiline rows={3} onChange={(value) => updateFoundation((draft) => {
        draft.generationDefaults.continuityPriority = value;
      })} />
      <ArrayField label="Recommended Clarifying Questions" values={foundation.assumptionsAndGaps.recommendedClarifyingQuestions} onChange={(values) => updateFoundation((draft) => {
        draft.assumptionsAndGaps.recommendedClarifyingQuestions = values;
      })} />
      <ArrayField label="Missing Information" values={foundation.assumptionsAndGaps.missingInformation} onChange={(values) => updateFoundation((draft) => {
        draft.assumptionsAndGaps.missingInformation = values;
      })} />
    </FieldGrid>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-8 md:grid-cols-2">{children}</div>;
}

function TextField({
  label,
  hint,
  value,
  onChange,
  multiline = false,
  rows = 2,
  large = false
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  large?: boolean;
}) {
  const inputClass = large
    ? "foundation-field w-full border-0 border-b border-outline-variant bg-transparent py-2 text-2xl font-semibold text-primary outline-none transition focus:border-intelligence-teal"
    : "foundation-field w-full rounded-none border-0 border-b border-outline-variant bg-transparent py-2 text-sm leading-6 text-on-surface outline-none transition focus:border-intelligence-teal";

  return (
    <label className={multiline || large ? "block md:col-span-2" : "block"}>
      <span className="ui-label mb-2 block text-on-surface-variant">{label}</span>
      {hint ? <span className="mb-2 block text-xs leading-5 text-on-surface-variant">{hint}</span> : null}
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={`${inputClass} resize-y`} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
    </label>
  );
}

function ArrayField({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <TextField
      label={label}
      hint="One item per line."
      value={values.join("\n")}
      multiline
      rows={4}
      onChange={(value) => onChange(value.split("\n").map((item) => item.trim()).filter(Boolean))}
    />
  );
}

function FoundationStatusCard({ status, updatedAt }: { status: StoryFoundationStatus | "draft"; updatedAt: string | null }) {
  return (
    <section className="foundation-panel rounded-md border border-memory-border bg-surface-container-lowest p-5">
      <div className="mb-3 flex items-center gap-2 text-intelligence-teal">
        <Sparkles size={16} />
        <h3 className="text-sm font-bold">Foundation Status</h3>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-on-surface-variant">Review state</span>
        <span className="rounded-full bg-intelligence-glow px-2 py-1 text-[11px] font-bold uppercase text-intelligence-teal">{status}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-on-surface-variant">
        {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}.` : "No update timestamp yet."}
      </p>
    </section>
  );
}

function SuggestionRail({ foundation, activeStep }: { foundation: StoryFoundation; activeStep: FoundationStep }) {
  const questions = foundation.assumptionsAndGaps.recommendedClarifyingQuestions.slice(0, 3);
  const stepHint: Record<FoundationStep, string> = {
    identity: foundation.coreConcept.readerPromise || "Make the reader promise specific enough to guide every generation.",
    genre: foundation.genre.genreBlend || "Genre is doing pacing work here; keep conventions and no-goes explicit.",
    style: foundation.styleGuide.povRules || "POV and tense are the easiest constraints for prose generation to drift on.",
    plan: foundation.chapter1Brief.endingHook || "A useful opening brief needs an ending state, not just a starting image."
  };

  return (
    <section className="foundation-panel foundation-suggestion-rail rounded-md border border-memory-border bg-surface-container-low p-5">
      <SectionHeading icon={<Sparkles size={16} />} title="Creative Suggestions" />
      <div className="space-y-3">
        <SuggestionCard title="Current Focus" label={activeStep} body={stepHint[activeStep]} />
        <SuggestionCard title="Reader Promise" label="anchor" body={foundation.coreConcept.readerPromise || "The reader promise is still open."} />
        {questions.length ? <SuggestionCard title="Open Questions" label="review" body={questions.join(" ")} /> : null}
      </div>
    </section>
  );
}

function SuggestionCard({ title, label, body }: { title: string; label: string; body: string }) {
  return (
    <article className="rounded-md border border-memory-border bg-surface-container-lowest p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-intelligence-teal">{title}</h4>
        <span className="text-[10px] font-bold uppercase text-on-surface-variant">{label}</span>
      </div>
      <p className="text-sm leading-6 text-on-surface-variant">{body}</p>
    </article>
  );
}
