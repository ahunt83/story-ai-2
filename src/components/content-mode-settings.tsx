"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";

export function ContentModeSettings() {
  const [nsfwMode, setNsfwMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ userPreferences: { nsfwMode: boolean } }>("/api/user-preferences")
      .then((response) => {
        setNsfwMode(response.userPreferences.nsfwMode);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleMode() {
    const nextMode = !nsfwMode;
    const previous = nsfwMode;
    setSaving(true);
    setError(null);
    setNsfwMode(nextMode);

    try {
      const response = await apiFetch<{ userPreferences: { nsfwMode: boolean } }>("/api/user-preferences", {
        method: "PATCH",
        body: JSON.stringify({ nsfwMode: nextMode })
      });
      setNsfwMode(response.userPreferences.nsfwMode);
    } catch (err) {
      setNsfwMode(previous);
      setError(err instanceof Error ? err.message : "Could not save content mode");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-on-surface">{nsfwMode ? "NSFW mode is on" : "Safe mode is on"}</p>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            New logins default to safe mode. NSFW stories are hidden unless this mode is enabled.
          </p>
        </div>
        <Button variant={nsfwMode ? "teal" : "secondary"} onClick={toggleMode} disabled={loading || saving}>
          {nsfwMode ? <Eye size={16} /> : <EyeOff size={16} />}
          {saving ? "Saving..." : nsfwMode ? "NSFW Mode" : "Safe Mode"}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
