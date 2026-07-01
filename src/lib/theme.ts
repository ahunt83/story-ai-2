export const themePreferences = ["light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];

export const defaultThemePreference: ThemePreference = "light";
export const localUserId = "local-user";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && themePreferences.includes(value as ThemePreference);
}
