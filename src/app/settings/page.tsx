import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StorySettingsClient } from "@/components/story-settings-client";
import { ThemeSettings } from "@/components/theme-settings";
import { MemoryCard } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/env";

export default async function SettingsPage() {
  if (!(await currentUser())) {
    redirect("/login");
  }

  const rows = [
    ["Chat model", env.openRouterChatModel],
    ["Extraction model", env.openRouterExtractModel],
    ["Embedding model", env.openRouterEmbeddingModel],
    ["Embedding dimensions", String(env.openRouterEmbeddingDimensions)],
    ["API key", env.openRouterApiKey ? "Configured" : "Missing"]
  ];

  return (
    <Suspense fallback={null}>
      <AppShell title="Settings">
        <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
          <h2 className="headline-serif mb-6 text-3xl text-primary">Local MVP Settings</h2>
          <StorySettingsClient />
          <div className="mb-5">
            <MemoryCard title="Appearance">
              <p className="mb-4">Choose how Codex looks for your user profile. The preference is saved to your account and applied across the app.</p>
              <ThemeSettings />
            </MemoryCard>
          </div>
          <MemoryCard title="OpenRouter">
            <p className="mb-4">Configure `OPENROUTER_API_KEY` and model names in `.env.local`. Without a key, API routes use deterministic local fallbacks for development.</p>
            <div className="divide-y divide-outline-variant rounded-md border border-outline-variant">
              {rows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-2 gap-4 px-3 py-2 text-sm">
                  <span className="font-bold text-on-surface">{label}</span>
                  <span className="text-on-surface-variant">{value}</span>
                </div>
              ))}
            </div>
          </MemoryCard>
        </div>
      </AppShell>
    </Suspense>
  );
}
