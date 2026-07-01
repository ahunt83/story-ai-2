"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiFetch } from "@/lib/client-api";
import { defaultThemePreference, isThemePreference, type ThemePreference } from "@/lib/theme";

const storageKey = "codex-theme-preference";

type ThemeContextValue = {
  themePreference: ThemePreference;
  loading: boolean;
  saving: boolean;
  error: string | null;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(defaultThemePreference);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = readCachedThemePreference();
    applyThemePreference(cached);
    setThemePreferenceState(cached);

    apiFetch<{ userPreferences: { themePreference: string } }>("/api/user-preferences")
      .then((response) => {
        const preference = isThemePreference(response.userPreferences.themePreference)
          ? response.userPreferences.themePreference
          : defaultThemePreference;
        cacheThemePreference(preference);
        applyThemePreference(preference);
        setThemePreferenceState(preference);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    const previous = themePreference;
    setSaving(true);
    setError(null);
    setThemePreferenceState(preference);
    cacheThemePreference(preference);
    applyThemePreference(preference);

    try {
      const response = await apiFetch<{ userPreferences: { themePreference: string } }>("/api/user-preferences", {
        method: "PATCH",
        body: JSON.stringify({ themePreference: preference })
      });
      const persistedPreference = isThemePreference(response.userPreferences.themePreference)
        ? response.userPreferences.themePreference
        : preference;
      setThemePreferenceState(persistedPreference);
      cacheThemePreference(persistedPreference);
      applyThemePreference(persistedPreference);
    } catch (err) {
      setThemePreferenceState(previous);
      cacheThemePreference(previous);
      applyThemePreference(previous);
      setError(err instanceof Error ? err.message : "Could not save theme preference");
    } finally {
      setSaving(false);
    }
  }, [themePreference]);

  const value = useMemo<ThemeContextValue>(() => ({
    themePreference,
    loading,
    saving,
    error,
    setThemePreference
  }), [error, loading, saving, setThemePreference, themePreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useThemePreference must be used within ThemeProvider");
  }
  return value;
}

function readCachedThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return defaultThemePreference;
  }

  const preference = window.localStorage.getItem(storageKey);
  return isThemePreference(preference) ? preference : defaultThemePreference;
}

function cacheThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, preference);
}

function applyThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = preference;
}
