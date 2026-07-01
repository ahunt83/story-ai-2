"use client";

import { Moon, Sun, type LucideIcon } from "lucide-react";

import { type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useThemePreference } from "./theme-provider";

const options: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon }
];

export function ThemeSettings() {
  const { themePreference, loading, saving, error, setThemePreference } = useThemePreference();

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          const active = themePreference === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setThemePreference(option.value)}
              disabled={saving}
              className={cn(
                "flex items-center justify-between gap-4 rounded-md border p-4 text-left transition",
                active
                  ? "border-intelligence-teal bg-intelligence-glow text-intelligence-teal"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-intelligence-teal/60"
              )}
              aria-pressed={active}
            >
              <span>
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="mt-1 block text-xs font-bold uppercase text-on-surface-variant">
                  {option.value === "dark" ? "Nocturnal Scholar" : "Classic parchment"}
                </span>
              </span>
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface">
          {loading ? "Loading preference..." : saving ? "Saving..." : `Current: ${themePreference}`}
        </span>
        {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
