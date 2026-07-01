import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex Story AI",
  description: "AI story writing with structured continuity memory."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themePreferenceScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

const themePreferenceScript = `
try {
  var preference = localStorage.getItem("codex-theme-preference");
  document.documentElement.dataset.theme = preference === "dark" ? "dark" : "light";
} catch (error) {
  document.documentElement.dataset.theme = "light";
}
`;
