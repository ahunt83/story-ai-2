import { AppShell } from "@/components/app-shell";
import { MemoryCard } from "@/components/ui";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <h2 className="headline-serif mb-6 text-3xl text-primary">Local MVP Settings</h2>
        <MemoryCard title="OpenRouter">
          Configure `OPENROUTER_API_KEY` and model names in `.env.local`. Without a key, API routes use deterministic local fallbacks for development.
        </MemoryCard>
      </div>
    </AppShell>
  );
}
