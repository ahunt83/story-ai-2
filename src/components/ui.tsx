import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Importance } from "@/lib/story-memory/schema";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "teal";
}) {
  const classes = {
    primary: "bg-primary text-on-primary hover:opacity-90",
    secondary: "border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low",
    ghost: "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
    teal: "bg-intelligence-teal text-white hover:brightness-105"
  };

  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition active:scale-[0.98]", classes[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function MemoryCard({
  title,
  children,
  importance,
  meta,
  className
}: {
  title: string;
  children: ReactNode;
  importance?: Importance;
  meta?: string;
  className?: string;
}) {
  return (
    <article className={cn("rounded-md border border-memory-border bg-white p-4 transition hover:border-intelligence-teal/50", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-primary">{title}</h3>
        {importance ? <ImportancePill importance={importance} /> : null}
      </div>
      <div className="text-sm leading-6 text-on-surface-variant">{children}</div>
      {meta ? <p className="mt-3 border-t border-memory-border pt-2 text-[11px] font-semibold uppercase text-on-primary-container">{meta}</p> : null}
    </article>
  );
}

export function ImportancePill({ importance }: { importance: Importance }) {
  const classes = {
    critical: "bg-intelligence-teal text-white border-intelligence-teal",
    major: "border-intelligence-teal text-intelligence-teal bg-white",
    minor: "border-outline-variant text-on-surface-variant bg-surface-container-low"
  };

  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", classes[importance])}>
      {importance}
    </span>
  );
}

export function SectionHeading({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="ui-label flex items-center gap-2 text-on-surface-variant">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
