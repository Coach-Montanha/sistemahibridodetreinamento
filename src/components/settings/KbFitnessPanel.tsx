import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  RotateCcw,
  Loader2,
  Dumbbell,
  Activity,
  Wrench,
  Wind,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlocoPref } from "@/lib/generator-prefs.functions";
import type { Methodology } from "@/lib/methodology";

export type KbCategoria = "Kettlebell" | "Ginásticos" | "Dumbbell" | "Barbell" | "Objetos Alternativos";

export const KB_CATEGORIAS: {
  key: KbCategoria;
  peso: string;
  icon: typeof Dumbbell;
  hint: string;
}[] = [
  { key: "Kettlebell", peso: "81%", icon: Dumbbell, hint: "coluna do motor" },
  { key: "Ginásticos", peso: "15%", icon: Activity, hint: "peso corporal" },
  { key: "Dumbbell", peso: "2%", icon: Dumbbell, hint: "halteres" },
  { key: "Barbell", peso: "1%", icon: Wrench, hint: "barra" },
  { key: "Objetos Alternativos", peso: "—", icon: Wind, hint: "sacos, cordas" },
];

export function ensureKbBloco(blocos: BlocoPref[]): BlocoPref {
  if (blocos.length > 0) return blocos[0];
  return {
    formato: "kb_timed_sets",
    presetId: "builtin:kb_timed_sets",
    titulo: "Kettlebell Fitness",
    duracao_min: null,
    num_exercicios: 6,
    series: 6,
    seriesMin: 6,
    seriesMax: 6,
    reps_base: 12,
    repsPorExercicio: 12,
    reps_pattern: [],
    progressao: "nenhuma",
    passos: [],
    tempo_trabalho: null,
    tempo_descanso: null,
    descansoAposSeg: 0,
    modoExecucao: "circuito",
    selecaoExercicios: "ia",
    exerciciosFixos: [],
    fonteExercicios: {},
    modalidades_alvo: [],
    equipamentos_alvo: [],
    exercicios_permitidos: [],
  };
}

export function KbFitnessPanel({
  state,
  onUpdate,
}: {
  state: { blocos: BlocoPref[]; loading: boolean };
  onUpdate: (fn: (blocos: BlocoPref[]) => BlocoPref[]) => void;
}) {
  if (state.loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border/60 bg-card/60 py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando configuração…
      </div>
    );
  }

  const bloco = ensureKbBloco(state.blocos);
  const cats = (bloco.kb_categorias_ativas ?? {}) as Record<string, boolean>;
  const isAtiva = (k: KbCategoria) => cats[k] ?? true;
  const ativasCount = KB_CATEGORIAS.reduce((n, c) => n + (isAtiva(c.key) ? 1 : 0), 0);

  const numOverride = bloco.kb_num_estacoes_override ?? null;
  const durOverride = bloco.kb_duracao_min_override ?? null;
  const autoEstacoes = numOverride === null;
  const autoDuracao = durOverride === null;

  function patch(update: Partial<BlocoPref>) {
    onUpdate((prev) => {
      const base = ensureKbBloco(prev);
      const next = { ...base, ...update };
      return [next, ...prev.slice(1)];
    });
  }

  function toggleCategoria(k: KbCategoria) {
    const next = { ...cats, [k]: !isAtiva(k) };
    patch({ kb_categorias_ativas: next });
  }

  function restaurarPadrao() {
    patch({
      kb_categorias_ativas: undefined,
      kb_num_estacoes_override: null,
      kb_duracao_min_override: null,
    });
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho contextual */}
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-primary/[0.04] via-card to-card p-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Estrutura do motor KB Fitness
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            O motor sorteia estrutura, categoria e exercícios por padrão. Use os
            controles abaixo para fixar duração, nº de estações ou restringir
            categorias — o restante segue no automático.
          </p>
        </div>
      </div>

      {/* Duração & estações */}
      <Card className="overflow-hidden border-border/60">
        <div className="border-b border-border/60 px-5 py-3.5">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">
            Duração e estações
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Deixe no automático para o motor sortear com base na distribuição real.
          </p>
        </div>
        <div className="divide-y divide-border/60">
          <OverrideRow
            label="Duração da sessão"
            auto={autoDuracao}
            onAutoChange={(v) =>
              patch({ kb_duracao_min_override: v ? null : durOverride ?? 30 })
            }
            value={durOverride ?? 30}
            onValueChange={(v) => patch({ kb_duracao_min_override: v })}
            min={10}
            max={60}
            step={1}
            unit="min"
            autoHint="30 min em 96% das sessões"
          />
          <OverrideRow
            label="Nº de estações"
            auto={autoEstacoes}
            onAutoChange={(v) =>
              patch({ kb_num_estacoes_override: v ? null : numOverride ?? 6 })
            }
            value={numOverride ?? 6}
            onValueChange={(v) => patch({ kb_num_estacoes_override: v })}
            min={3}
            max={10}
            step={1}
            unit={numOverride === 1 ? "estação" : "estações"}
            autoHint="5–6 em 91% das sessões"
          />
        </div>
      </Card>

      {/* Categorias ativas */}
      <Card className="overflow-hidden border-border/60">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-3.5">
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Categorias ativas
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Desativar redistribui os pesos entre as restantes. Mobilidade fica
              reservada à Preparação de Movimento.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {ativasCount}/{KB_CATEGORIAS.length}
          </span>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {KB_CATEGORIAS.map((c) => {
            const on = isAtiva(c.key);
            const Icon = c.icon;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleCategoria(c.key)}
                aria-pressed={on}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "active:translate-y-[1px]",
                  on
                    ? "border-primary/40 bg-primary/[0.06] text-foreground hover:border-primary/60"
                    : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                    on ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-none">
                    {c.key}
                  </span>
                  <span className="mt-1 block text-[11px] leading-none text-muted-foreground">
                    peso padrão {c.peso} · {c.hint}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    on
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {on ? "Ativa" : "Off"}
                </span>
              </button>
            );
          })}
        </div>
        {ativasCount === 0 && (
          <div className="border-t border-border/60 bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
            Nenhuma categoria ativa — o motor volta ao padrão (Kettlebell) para não
            gerar sessão vazia.
          </div>
        )}
      </Card>

      <PrepMovimentoCard bloco={bloco} patch={patch} />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="min-w-0">
          A seleção final de exercícios continua vindo do seu banco marcado como
          <span className="mx-1 font-medium text-foreground">Kettlebell Fitness</span>.
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={restaurarPadrao}
          className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Padrão
        </Button>
      </div>
    </div>
  );
}

export function OverrideRow({
  label,
  auto,
  onAutoChange,
  value,
  onValueChange,
  min,
  max,
  step,
  unit,
  autoHint,
}: {
  label: string;
  auto: boolean;
  onAutoChange: (v: boolean) => void;
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  autoHint: string;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center justify-between gap-3 sm:w-56 sm:justify-start">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-none text-foreground">{label}</p>
          <p className="mt-1 text-[11px] leading-none text-muted-foreground">
            {auto ? autoHint : "Fixado por você"}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 sm:hidden">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Auto
          </span>
          <Switch checked={auto} onCheckedChange={onAutoChange} />
        </label>
      </div>
      <div className="flex flex-1 items-center gap-4">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[auto ? value : value]}
          disabled={auto}
          onValueChange={([v]) => onValueChange(v)}
          className={cn("flex-1 transition-opacity", auto && "opacity-50")}
        />
        <span
          className={cn(
            "min-w-[74px] shrink-0 rounded-md border px-2.5 py-1 text-right text-sm font-semibold tabular-nums transition-colors",
            auto
              ? "border-border/60 bg-muted/40 text-muted-foreground"
              : "border-primary/40 bg-primary/[0.08] text-foreground",
          )}
        >
          {value} <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{unit}</span>
        </span>
        <label className="hidden shrink-0 items-center gap-2 sm:flex">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Auto
          </span>
          <Switch checked={auto} onCheckedChange={onAutoChange} />
        </label>
      </div>
    </div>
  );
}

export function PrepMovimentoCard({
  bloco,
  patch,
}: {
  bloco: BlocoPref;
  patch: (u: Partial<BlocoPref>) => void;
}) {
  const enabled = !!bloco.kb_prep_enabled;
  const mob = bloco.kb_prep_mobilidade ?? 3;
  const aq = bloco.kb_prep_aquecimento ?? 2;
  const dur = bloco.kb_prep_duracao_min ?? 8;
  const tempo = bloco.kb_prep_tempo_seg ?? 30;
  const total = mob + aq;

  return (
    <Card className="overflow-hidden border-border/60">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-3.5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
              enabled ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-muted/60 text-muted-foreground",
            )}
          >
            <Wind className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Preparação de Movimento
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Anexa um bloco de mobilidade e aquecimento antes do motor automático.
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => patch({ kb_prep_enabled: v })}
          aria-label="Ativar Preparação de Movimento"
        />
      </div>

      {enabled && (
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SlotCounter
              icon={Wind}
              label="Mobilidade"
              hint="tempo por movimento"
              value={mob}
              onChange={(v) => patch({ kb_prep_mobilidade: v })}
              min={0}
              max={10}
            />
            <SlotCounter
              icon={Flame}
              label="Aquecimento"
              hint="movimentos leves"
              value={aq}
              onChange={(v) => patch({ kb_prep_aquecimento: v })}
              min={0}
              max={10}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <NumberRow
              label="Duração"
              unit="min"
              value={dur}
              min={1}
              max={30}
              onChange={(v) => patch({ kb_prep_duracao_min: v })}
            />
            <NumberRow
              label="Tempo por mobilidade"
              unit="seg"
              value={tempo}
              min={10}
              max={180}
              step={5}
              onChange={(v) => patch({ kb_prep_tempo_seg: v })}
            />
          </div>

          {total === 0 && (
            <div className="rounded-md border border-warning/30 bg-warning/[0.06] px-3 py-2 text-xs text-warning-foreground">
              Com 0 mobilidades e 0 aquecimentos, nenhum bloco será criado.
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Mobilidades são sorteadas dentre exercícios marcados como
            <span className="mx-1 font-medium text-foreground">Mobilidade</span>
            no seu banco. Aquecimento usa exercícios leves do banco geral.
          </p>
        </div>
      )}
    </Card>
  );
}

export function SlotCounter({
  icon: Icon,
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  icon: typeof Wind;
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 transition-colors hover:border-border">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-none text-foreground">{label}</p>
        <p className="mt-1 text-[11px] leading-none text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-md"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Diminuir ${label.toLowerCase()}`}
        >
          <span className="text-base leading-none">−</span>
        </Button>
        <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums text-foreground">
          {value}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 rounded-md"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Aumentar ${label.toLowerCase()}`}
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>
    </div>
  );
}

export function NumberRow({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <Input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          className="h-8 w-20 text-right tabular-nums"
        />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {unit}
        </span>
      </span>
    </label>
  );
}
