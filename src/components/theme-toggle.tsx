import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options: Array<{ value: "light" | "dark" | "system"; icon: typeof Sun; label: string }> = [
    { value: "light", icon: Sun, label: "Claro" },
    { value: "dark", icon: Moon, label: "Escuro" },
    { value: "system", icon: Monitor, label: "Sistema" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 p-0.5",
        className,
      )}
      role="radiogroup"
      aria-label="Tema"
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-all",
              "hover:text-foreground",
              active && "bg-background text-foreground shadow-sm",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}