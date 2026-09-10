import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, Flame, Zap, Dumbbell, ShieldCheck } from "lucide-react";

interface OneRepMaxDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialWeight?: number;
  initialReps?: number;
}

export function OneRepMaxDialog({
  open,
  onOpenChange,
  trigger,
  initialWeight = 60,
  initialReps = 5,
}: OneRepMaxDialogProps) {
  const [weight, setWeight] = React.useState<number>(initialWeight);
  const [reps, setReps] = React.useState<number>(initialReps);

  // Fórmulas consolidadas da fisiologia do exercício
  const epley = React.useMemo(() => {
    if (!weight || !reps || reps <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + 0.0333 * reps);
  }, [weight, reps]);

  const brzycki = React.useMemo(() => {
    if (!weight || !reps || reps <= 0) return 0;
    if (reps === 1) return weight;
    if (reps >= 37) return weight;
    return weight / (1.0278 - 0.0278 * reps);
  }, [weight, reps]);

  // Média ponderada entre Epley e Brzycki para maior acurácia
  const estimated1RM = React.useMemo(() => {
    if (reps === 1) return weight;
    return Math.round(((epley + brzycki) / 2) * 10) / 10;
  }, [epley, brzycki, reps, weight]);

  const percentages = React.useMemo(() => {
    const list = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
    return list.map((pct) => ({
      percentage: pct,
      load: Math.round((estimated1RM * (pct / 100)) * 2) / 2, // múltiplos de 0.5kg
      estReps:
        pct === 100
          ? "1 rep"
          : pct >= 90
          ? "2 - 4 reps"
          : pct >= 80
          ? "5 - 8 reps"
          : pct >= 70
          ? "8 - 12 reps"
          : "15+ reps",
    }));
  }, [estimated1RM]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Calculadora de 1RM</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Estime sua repetição máxima e consulte as zonas de esforço com base nas fórmulas de Brzycki e Epley.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Carga utilizada (kg)</Label>
              <Input
                type="number"
                min={1}
                max={600}
                step={0.5}
                value={weight || ""}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="mt-1"
                placeholder="Ex: 80"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Repetições feitas</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={reps || ""}
                onChange={(e) => setReps(Number(e.target.value))}
                className="mt-1"
                placeholder="Ex: 5"
              />
            </div>
          </div>

          {/* Resultado Destaque */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 text-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              1RM Estimado
            </span>
            <div className="flex items-baseline justify-center gap-1.5 mt-1">
              <span className="text-4xl font-black tracking-tight text-primary">
                {estimated1RM > 0 ? estimated1RM.toFixed(1) : "0"}
              </span>
              <span className="text-sm font-bold text-muted-foreground">kg</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Brzycki: {brzycki.toFixed(1)}kg
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Epley: {epley.toFixed(1)}kg
              </Badge>
            </div>
          </div>

          {/* Zonas de Treinamento */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Zonas de Adaptação Fisiológica
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border p-2.5 bg-card/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-500">
                  <Flame className="h-3.5 w-3.5" /> Força Máxima
                </div>
                <div className="text-[11px] text-muted-foreground">90% - 100% (1 a 3 reps)</div>
                <div className="font-semibold text-foreground">
                  {(estimated1RM * 0.9).toFixed(1)} - {estimated1RM.toFixed(1)} kg
                </div>
              </div>

              <div className="rounded-lg border p-2.5 bg-card/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-500">
                  <Zap className="h-3.5 w-3.5" /> Potência
                </div>
                <div className="text-[11px] text-muted-foreground">75% - 85% (3 a 5 reps)</div>
                <div className="font-semibold text-foreground">
                  {(estimated1RM * 0.75).toFixed(1)} - {(estimated1RM * 0.85).toFixed(1)} kg
                </div>
              </div>

              <div className="rounded-lg border p-2.5 bg-card/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-500">
                  <Dumbbell className="h-3.5 w-3.5" /> Hipertrofia
                </div>
                <div className="text-[11px] text-muted-foreground">67% - 85% (6 a 12 reps)</div>
                <div className="font-semibold text-foreground">
                  {(estimated1RM * 0.67).toFixed(1)} - {(estimated1RM * 0.85).toFixed(1)} kg
                </div>
              </div>

              <div className="rounded-lg border p-2.5 bg-card/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sky-500">
                  <ShieldCheck className="h-3.5 w-3.5" /> Resistência
                </div>
                <div className="text-[11px] text-muted-foreground">&lt;67% (15+ reps)</div>
                <div className="font-semibold text-foreground">
                  &lt; {(estimated1RM * 0.67).toFixed(1)} kg
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Porcentagens */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Escala de Porcentagens (% da Carga)
            </h4>
            <div className="rounded-lg border overflow-hidden text-xs">
              <div className="grid grid-cols-3 bg-muted/50 p-2 font-semibold text-muted-foreground">
                <span>Intensidade</span>
                <span className="text-center">Carga (kg)</span>
                <span className="text-right">Reps Estimadas</span>
              </div>
              <div className="divide-y divide-border/60 max-h-48 overflow-y-auto no-scrollbar">
                {percentages.map((p) => (
                  <div key={p.percentage} className="grid grid-cols-3 p-2 hover:bg-muted/30 items-center">
                    <span className="font-medium text-foreground">{p.percentage}%</span>
                    <span className="text-center font-bold text-primary">{p.load} kg</span>
                    <span className="text-right text-muted-foreground text-[11px]">{p.estReps}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
