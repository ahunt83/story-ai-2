import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Codex Story AI",
  description: "AI story writing with structured continuity memory."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
