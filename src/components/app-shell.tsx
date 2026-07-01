"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  History,
  Home,
  Landmark,
  Menu,
  MoreVertical,
  PenLine,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  X
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Library", icon: Home },
  { href: "/foundation", label: "Foundation", icon: Landmark },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/bible", label: "Story Bible", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({
  children,
  title,
  activeTab,
  tabs,
  action,
  status
}: {
  children: ReactNode;
  title: string;
  activeTab?: string;
  tabs?: Array<{ label: string; href: string; active?: boolean }>;
  action?: ReactNode;
  status?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-parchment-base text-on-surface">
      <SideNav mobileOpen={open} onClose={() => setOpen(false)} />
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-parchment-base/95 px-4 backdrop-blur lg:left-sidebar lg:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <button className="rounded-md p-2 text-on-surface-variant hover:bg-surface-container-low lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          {status}
          <div className="min-w-0">
            <h1 className="headline-serif truncate text-2xl text-primary md:text-[32px]">{title}</h1>
            {activeTab ? <p className="text-xs font-bold uppercase text-intelligence-teal md:hidden">{activeTab}</p> : null}
          </div>
          {tabs ? (
            <nav className="hidden items-center gap-5 md:flex">
              {tabs.map((tab) => (
                <Link
                  key={`${tab.href}:${tab.label}`}
                  href={tab.href}
                  className={cn(
                    "border-b-2 pb-1 text-xs font-bold transition",
                    tab.active ? "border-intelligence-teal text-intelligence-teal" : "border-transparent text-on-surface-variant hover:text-primary"
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden items-center gap-1 text-on-surface-variant sm:flex">
            <IconButton label="History"><History size={19} /></IconButton>
            <IconButton label="Share"><Share2 size={18} /></IconButton>
            <IconButton label="More"><MoreVertical size={19} /></IconButton>
          </div>
          {action}
          <AccountMenu />
        </div>
      </header>
      <main className="desktop-shell-offset min-h-screen pt-16 lg:ml-sidebar">{children}</main>
    </div>
  );
}

function AccountMenu() {
  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button onClick={logout} className="rounded-md border border-outline-variant bg-white px-3 py-2 text-xs font-bold text-on-surface-variant transition hover:border-intelligence-teal hover:text-primary">
      Sign Out
    </button>
  );
}

function SideNav({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nav = (
    <aside className="flex h-full w-sidebar flex-col bg-primary-container px-6 py-8 text-on-primary-container">
      <div className="mb-12 flex items-start justify-between">
        <div>
          <Link href="/" className="display-title block leading-none text-intelligence-teal">Codex</Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-on-primary-container">Creative Professional</p>
        </div>
        <button className="rounded-md p-2 text-intelligence-teal lg:hidden" onClick={onClose} aria-label="Close navigation">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = preserveLiveContext(item.href, searchParams);
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-4 rounded-md px-4 py-3 text-sm font-bold transition",
                active ? "border-r-2 border-intelligence-teal bg-white/10 text-intelligence-teal" : "hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Button variant="teal" className="w-full py-4 uppercase tracking-[0.12em]">
        <Plus size={18} />
        New Story
      </Button>
    </aside>
  );

  return (
    <>
      <div className="fixed left-0 top-0 z-50 hidden h-screen lg:block">{nav}</div>
      <div className={cn("fixed inset-0 z-50 bg-black/35 transition lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div className={cn("h-full transition-transform", mobileOpen ? "translate-x-0" : "-translate-x-full")}>{nav}</div>
      </div>
    </>
  );
}

function preserveLiveContext(href: string, searchParams: { get(name: string): string | null }) {
  if (href === "/" || href.includes("?")) {
    return href;
  }

  const params = new URLSearchParams();
  const chapterId = searchParams.get("chapterId");
  const storyId = searchParams.get("storyId");

  if (href.startsWith("/writing")) {
    if (chapterId) {
      params.set("chapterId", chapterId);
    } else if (storyId) {
      params.set("storyId", storyId);
    }
  }

  if (href === "/foundation") {
    if (storyId) {
      params.set("storyId", storyId);
    } else if (chapterId) {
      params.set("chapterId", chapterId);
    }
  }

  if (href === "/bible") {
    if (storyId) {
      params.set("storyId", storyId);
    } else if (chapterId) {
      params.set("chapterId", chapterId);
    }
  }

  const query = params.toString();
  return query ? `${href}?${query}` : href;
}

export function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button className="rounded-md p-2 transition hover:bg-surface-container-low hover:text-primary" aria-label={label} title={label}>
      {children}
    </button>
  );
}

export function SearchBox({ placeholder = "Search manuscript..." }: { placeholder?: string }) {
  return (
    <label className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={17} />
      <input
        className="h-10 w-64 rounded-full border-0 bg-surface-container-low pl-10 pr-4 text-sm outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-intelligence-teal"
        placeholder={placeholder}
      />
    </label>
  );
}

export function AiStatus({ label = "AI Drafting..." }: { label?: string }) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-intelligence-teal/20 bg-intelligence-glow px-3 py-1 sm:flex">
      <span className="h-2 w-2 animate-pulse rounded-full bg-intelligence-teal" />
      <span className="text-[10px] font-bold uppercase text-intelligence-teal">{label}</span>
    </div>
  );
}

export function SparkleAction({ label }: { label: string }) {
  return (
    <Button variant="secondary" className="rounded-full bg-white shadow-sm">
      <Sparkles size={16} className="text-intelligence-teal" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
