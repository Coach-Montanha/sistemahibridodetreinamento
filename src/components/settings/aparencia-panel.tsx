import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredTheme, setStoredTheme, type VisualTheme } from "@/lib/theme";
import { toast } from "sonner";

export function AparenciaPanel() {
  const [activeTheme, setActiveTheme] = useState<VisualTheme>("padrao");

  useEffect(() => {
    setActiveTheme(getStoredTheme());
  }, []);

  const handleThemeChange = (theme: VisualTheme) => {
    setActiveTheme(theme);
    setStoredTheme(theme);
    toast.success(`Tema ${theme === 'pulse' ? 'Pulse' : 'Padrão'} aplicado`);
    // Reload to ensure all CSS variables and classes are correctly applied across the app
    window.location.reload();
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ThemeCard
        label="Padrão"
        description="O visual clássico do Coach Montanha."
        isActive={activeTheme === "padrao"}
        onClick={() => handleThemeChange("padrao")}
        colors={["#F26B1F", "#0F1115", "#F5F5F4"]}
      />
      <ThemeCard
        label="Pulse"
        description="Visual moderno com bordas arredondadas e alto contraste."
        isActive={activeTheme === "pulse"}
        onClick={() => handleThemeChange("pulse")}
        colors={["#FF6B00", "#0A0A0C", "#18181C"]}
      />
    </div>
  );
}

function ThemeCard({
  label,
  description,
  isActive,
  onClick,
  colors,
}: {
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  colors: string[];
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all hover:border-primary/50",
        isActive ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
      )}
    >
      {isActive && (
        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}
      <div className="flex gap-1.5">
        {colors.map((c, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-full border border-white/10"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div>
        <h4 className="font-bold tracking-tight">{label}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
