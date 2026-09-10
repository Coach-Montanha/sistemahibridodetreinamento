import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  X,
  Loader2,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  METHODOLOGY_LABEL,
  BLOCK_FORMAT_LABEL,
  ENABLED_FORMATS,
  type Methodology,
} from "@/lib/methodology";
import {
  listEquipamentos,
  countExercicios,
  type BlocoPref,
} from "@/lib/generator-prefs.functions";
import { useQuery } from "@tanstack/react-query";
import { CurationSection } from "./CurationSheet";

export function TargetingSection({
  bloco,
  onChange,
}: {
  bloco: BlocoPref;
  onChange: (b: BlocoPref) => void;
}) {
  const equipQuery = useQuery({
    queryKey: ["equipamentos"],
    queryFn: () => listEquipamentos(),
    staleTime: 60_000,
  });

  const modalidades = bloco.modalidades_alvo ?? [];
  const equipamentos = bloco.equipamentos_alvo ?? [];

  const countKey = [
    "count-exercicios",
    modalidades.slice().sort().join("|"),
    equipamentos.slice().sort().join("|"),
  ];
  const countQuery = useQuery({
    queryKey: countKey,
    queryFn: () =>
      countExercicios({
        data: {
          modalidades: modalidades as any,
          equipamentos,
        },
      }),
    enabled: modalidades.length > 0,
    staleTime: 30_000,
  });

  const toggleMod = (m: Methodology) => {
    const next = modalidades.includes(m)
      ? modalidades.filter((x) => x !== m)
      : [...modalidades, m];
    onChange({ ...bloco, modalidades_alvo: next as any });
  };
  const toggleEquip = (e: string) => {
    const next = equipamentos.includes(e)
      ? equipamentos.filter((x) => x !== e)
      : [...equipamentos, e];
    onChange({ ...bloco, equipamentos_alvo: next });
  };

  const alvo = modalidades.length === 0;
  const count = countQuery.data ?? 0;
  const needed = bloco.num_exercicios ?? 3;
  const insuficiente = !alvo && !countQuery.isLoading && count < needed;

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-3.5 sm:p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            Direcionamento do sorteio
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Restrinja de quais modalidades e equipamentos o motor sorteia neste bloco.
          </p>
        </div>
        {modalidades.length > 0 && (
          <Badge
            variant="outline"
            className={cn(
              "self-start sm:self-auto gap-1.5 border-border/70 font-medium tabular-nums shrink-0",
              countQuery.isLoading && "opacity-60",
              insuficiente && "border-warning/50 bg-warning/10 text-warning-foreground",
              !insuficiente && count > 0 && "border-primary/40 bg-primary/10 text-primary font-semibold",
            )}
          >
            <span className="text-xs sm:text-sm font-bold">{count}</span>
            <span className="text-[10px] uppercase tracking-wider">
              {count === 1 ? "exercício" : "exercícios"} · precisa {needed}
            </span>
          </Badge>
        )}
      </div>

      {/* Seção Modalidades */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Modalidades
          </Label>
          {modalidades.length === 0 ? (
            <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40">
              Padrão: usa a modalidade do treino
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {modalidades.length} selecionada{modalidades.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...bloco, modalidades_alvo: [] })}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(Object.keys(METHODOLOGY_LABEL) as Methodology[]).map((m) => {
            const active = modalidades.includes(m);
            return (
              <button
                type="button"
                key={m}
                onClick={() => toggleMod(m)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150 text-left min-h-[38px] cursor-pointer",
                  active
                    ? "border-primary bg-primary/15 text-primary shadow-xs font-semibold ring-1 ring-primary/40"
                    : "border-border/70 bg-background/80 text-muted-foreground hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
                )}
              >
                <span className="truncate">{METHODOLOGY_LABEL[m]}</span>
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-background/50",
                  )}
                >
                  {active && <Check className="h-3 w-3" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seção Equipamentos */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
            Equipamentos
          </Label>
          {equipamentos.length === 0 ? (
            <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40">
              Padrão: qualquer equipamento
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {equipamentos.length} selecionado{equipamentos.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...bloco, equipamentos_alvo: [] })}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        {equipQuery.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Carregando lista de equipamentos…
          </div>
        ) : (equipQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Nenhum equipamento cadastrado no seu banco.
          </p>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(equipQuery.data ?? []).map((eq) => {
              const active = equipamentos.includes(eq);
              return (
                <button
                  type="button"
                  key={eq}
                  onClick={() => toggleEquip(eq)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs capitalize transition-all duration-150 text-left min-h-[38px] cursor-pointer",
                    active
                      ? "border-primary bg-primary/15 text-primary shadow-xs font-semibold ring-1 ring-primary/40"
                      : "border-border/70 bg-background/80 text-muted-foreground hover:border-primary/40 hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <span className="truncate">{eq}</span>
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-background/50",
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {insuficiente && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs text-warning-foreground leading-relaxed">
          Apenas {count} exercício{count === 1 ? "" : "s"} atende{count === 1 ? "" : "m"} a esses filtros. O motor precisará de {needed} e poderá repetir ou acionar fallback.
        </div>
      )}
    </div>
  );
}

export function SortableBloco({
  id,
  index,
  bloco,
  onChange,
  onRemove,
}: {
  id: string;
  index: number;
  bloco: BlocoPref;
  onChange: (b: BlocoPref) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group overflow-hidden border-border/60 transition-all duration-200",
        "hover:border-primary/40",
        isDragging && "shadow-xl ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-stretch gap-2 p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground transition-colors hover:text-primary active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label="Reordenar bloco"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-4">
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Formato</Label>
              <Select
                value={bloco.formato}
                onValueChange={(v) =>
                  onChange({ ...bloco, formato: v as any, presetId: v.includes(":") ? v : `builtin:${v}` })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENABLED_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>{BLOCK_FORMAT_LABEL[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Título</Label>
              <Input
                value={bloco.titulo}
                onChange={(e) => onChange({ ...bloco, titulo: e.target.value })}
                placeholder="Ex: Aquecimento articular"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <NumField
              label="Duração (min)"
              value={bloco.duracao_min ?? 0}
              min={0}
              max={180}
              onChange={(n) => onChange({ ...bloco, duracao_min: n || null })}
            />
            <NumField
              label="Exercícios"
              value={bloco.num_exercicios}
              min={1}
              max={20}
              onChange={(n) => onChange({ ...bloco, num_exercicios: Math.max(1, n) })}
            />
            <NumField
              label="Séries"
              value={bloco.series ?? 0}
              min={1}
              max={20}
              onChange={(n) => onChange({ ...bloco, series: n || 0, seriesMin: n || 0, seriesMax: n || 0 })}
            />
            <NumField
              label="Reps base"
              value={bloco.reps_base}
              min={1}
              max={100}
              onChange={(n) => onChange({ ...bloco, reps_base: Math.max(1, n), repsPorExercicio: Math.max(1, n) })}
            />
          </div>

          <TargetingSection bloco={bloco} onChange={onChange} />
          <CurationSection bloco={bloco} onChange={onChange} />

          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Progressão avançada
            </button>

            {expanded && (
              <div className="mt-3 space-y-4 rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Progressão</Label>
                    <Select
                      value={bloco.progressao}
                      onValueChange={(v) => onChange({ ...bloco, progressao: v as BlocoPref["progressao"] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhuma">Nenhuma (reps base)</SelectItem>
                        <SelectItem value="piramide_crescente">Pirâmide crescente</SelectItem>
                        <SelectItem value="piramide_decrescente">Pirâmide decrescente</SelectItem>
                        <SelectItem value="onda">Onda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <RepsPattern
                    value={bloco.reps_pattern}
                    onChange={(reps_pattern) => onChange({ ...bloco, reps_pattern })}
                  />
                </div>

                {bloco.formato === "forca_tecnica_pct" && (
                  <PassosPct
                    value={bloco.passos}
                    onChange={(passos) => onChange({ ...bloco, passos })}
                  />
                )}

                {bloco.formato === "kb_timed_sets" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumField
                      label="Tempo trabalho (s)"
                      value={bloco.tempo_trabalho ?? 0}
                      min={0}
                      max={600}
                      onChange={(n) => onChange({ ...bloco, tempo_trabalho: n || null })}
                    />
                    <NumField
                      label="Tempo descanso (s)"
                      value={bloco.tempo_descanso ?? 0}
                      min={0}
                      max={600}
                      onChange={(n) => onChange({ ...bloco, tempo_descanso: n || null })}
                    />
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <NumField
                    label="Descanso bloco (s)"
                    value={bloco.descansoAposSeg}
                    min={0}
                    max={600}
                    onChange={(n) => onChange({ ...bloco, descansoAposSeg: n })}
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Execução</Label>
                    <Select value={bloco.modoExecucao} onValueChange={(v) => onChange({ ...bloco, modoExecucao: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circuito">Circuito</SelectItem>
                        <SelectItem value="series_fixas">Séries Fixas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Seleção Exerc.</Label>
                    <Select value={bloco.selecaoExercicios} onValueChange={(v) => onChange({ ...bloco, selecaoExercicios: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ia">Inteligência Artificial</SelectItem>
                        <SelectItem value="manual">Manual (Curadoria)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remover bloco"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
            #{index + 1}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function NumField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function RepsPattern({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [input, setInput] = useState("");

  function add() {
    const n = Number(input);
    if (!Number.isFinite(n) || n <= 0) return;
    onChange([...value, Math.floor(n)]);
    setInput("");
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Padrão de reps (opcional)
      </Label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
        {value.map((n, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">
            {n}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
              aria-label={`Remover ${n}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={value.length ? "" : "Ex: 12, 10, 8, 6"}
          className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          inputMode="numeric"
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Se preenchido, substitui reps base e progressão.
      </p>
    </div>
  );
}

export function PassosPct({
  value,
  onChange,
}: {
  value: { pct: number; sets: number; reps: number }[];
  onChange: (v: { pct: number; sets: number; reps: number }[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Passos %1RM
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...value, { pct: 60, sets: 3, reps: 5 }])}
          className="h-7 gap-1 text-xs"
        >
          <Plus className="h-3 w-3" /> Adicionar passo
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
          Sem passos definidos — o motor usa um padrão automático.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <NumField
                label={i === 0 ? "%1RM" : ""}
                value={p.pct}
                min={0}
                max={100}
                onChange={(n) => onChange(value.map((x, j) => (j === i ? { ...x, pct: n } : x)))}
              />
              <NumField
                label={i === 0 ? "Séries" : ""}
                value={p.sets}
                min={1}
                max={20}
                onChange={(n) => onChange(value.map((x, j) => (j === i ? { ...x, sets: n } : x)))}
              />
              <NumField
                label={i === 0 ? "Reps" : ""}
                value={p.reps}
                min={1}
                max={50}
                onChange={(n) => onChange(value.map((x, j) => (j === i ? { ...x, reps: n } : x)))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className={cn("h-9 w-9 self-end text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}
                aria-label="Remover passo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
