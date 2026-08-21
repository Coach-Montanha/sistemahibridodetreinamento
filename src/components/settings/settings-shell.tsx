import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiagnosticPanel } from "./DiagnosticPanel";

export { DiagnosticPanel };

export function SettingsHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 flex items-start gap-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </header>
  );
}

export function Fold({
  title,
  description,
  aside,
  className,
  children,
}: {
  title?: string;
  description?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm md:p-6",
        className,
      )}
    >
      {title ? (
        <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight tracking-tight md:text-lg">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
