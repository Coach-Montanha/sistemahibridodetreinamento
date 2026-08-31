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
    <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Direcionamento do sorteio
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Restrinja de quais modalidades e equipamentos o motor sorteia neste bloco.
          </p>
        </div>
        {modalidades.length > 0 && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 border-border/60 font-medium tabular-nums",
              countQuery.isLoading && "opacity-60",
              insuficiente && "border-warning/50 bg-warning/10 text-warning-foreground",
              !insuficiente && count > 0 && "border-primary/40 bg-primary/5 text-primary",
            )}
          >
            <span className="text-sm font-semibold">{count}</span>
            <span className="text-[10px] uppercase tracking-wider">
              {count === 1 ? "exercício" : "exercícios"} · precisa {needed}
            </span>
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Modalidades
          </Label>
          {modalidades.length === 0 && (
            <span className="text-[10px] text-muted-foreground">
              Vazio = usa a modalidade da geração
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(METHODOLOGY_LABEL) as Methodology[]).map((m) => {
            const active = modalidades.includes(m);
            return (
              <button
                type="button"
                key={m}
                onClick={() => toggleMod(m)}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {METHODOLOGY_LABEL[m]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Equipamentos
          </Label>
          {equipamentos.length === 0 && (
            <span className="text-[10px] text-muted-foreground">Vazio = qualquer equipamento</span>
          )}
        </div>
        {equipQuery.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando equipamentos…
          </div>
        ) : (equipQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum equipamento cadastrado no seu banco.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(equipQuery.data ?? []).map((eq) => {
              const active = equipamentos.includes(eq);
              return (
                <button
                  type="button"
                  key={eq}
                  onClick={() => toggleEquip(eq)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs capitalize transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {eq}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {insuficiente && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          Só {count} exercício{count === 1 ? "" : "s"} casam com esses filtros. O motor vai
          repetir ou usar fallback para completar os {needed} pedidos.
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
