import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  swatch?: string;
};

export function KpiRow({ items, loading }: { items: Kpi[]; loading?: boolean }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {items.map((k) => (
        <div
          key={k.label}
          className="group rounded-xl border border-border/60 bg-card/60 p-4 transition-colors duration-200 hover:border-primary/40 hover:bg-accent/20"
        >
          <div className="flex items-center gap-2">
            {k.swatch ? (
              <span
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-border/70"
                style={{ backgroundColor: k.swatch }}
              />
            ) : k.icon ? (
              <k.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
            ) : null}
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {k.label}
            </span>
          </div>
          <div
            title={k.value}
            className={cn(
              "mt-2 truncate font-semibold leading-tight tabular-nums",
              k.value.length > 13 ? "text-base md:text-lg" : "text-xl md:text-2xl",
              loading && "animate-pulse text-muted-foreground/60",
            )}
          >
            {loading ? "—" : k.value}
          </div>
          {k.hint ? (
            <p className="mt-1 truncate text-xs leading-snug text-muted-foreground">{k.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}