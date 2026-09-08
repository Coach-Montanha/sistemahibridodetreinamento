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
    <header className="mb-6 sm:mb-8 flex items-start gap-3 sm:gap-4 min-w-0">
      <div className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl break-words">
          {title}
        </h1>
        <p className="mt-1.5 max-w-xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
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
        "rounded-2xl border border-border/60 bg-card/60 p-3.5 shadow-sm sm:p-5 md:p-6 min-w-0",
        className,
      )}
    >
      {title ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight tracking-tight sm:text-lg break-words">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {aside ? <div className="shrink-0 self-start sm:self-auto">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
