import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Settings,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  X,
  Layers,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { useFormatRegistry } from "@/lib/format-registry";
import {
  getGeneratorPrefs,
  saveGeneratorPrefs,
  type BlocoPref,
} from "@/lib/generator-prefs.functions";
import {
  METHODOLOGY_LABEL,
  BLOCK_FORMAT_LABEL,
  ENABLED_FORMATS,
  type Methodology,
  type BlockFormat,
} from "@/lib/methodology";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  component: ConfiguracoesPage,
});

const METS = Object.keys(METHODOLOGY_LABEL) as Methodology[];

type State = Record<Methodology, { blocos: BlocoPref[]; origem: "custom" | "template"; loading: boolean; dirty: boolean }>;

function makeEmpty(): State {
  return METS.reduce((acc, m) => {
    acc[m] = { blocos: [], origem: "template", loading: true, dirty: false };
    return acc;
  }, {} as State);
}

function novoBloco(): BlocoPref {
  return {
    formato: "preparacao_movimento",
    titulo: "Novo bloco",
    duracao_min: 10,
    num_exercicios: 3,
    series: 3,
    reps_base: 10,
    reps_pattern: [],
    progressao: "nenhuma",
    passos: [],
    tempo_trabalho: null,
    tempo_descanso: null,
  };
}

function ConfiguracoesPage() {
  const load = useServerFn(getGeneratorPrefs);
  const save = useServerFn(saveGeneratorPrefs);
  const [state, setState] = useState<State>(makeEmpty);
  const [tab, setTab] = useState<Methodology>("hibrido");
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<"geracao" | "formatos">("geracao");

  useEffect(() => {
    const s = state[tab];
    if (!s.loading) return;
    load({ data: { metodologia: tab } })
      .then((res) =>
        setState((prev) => ({
          ...prev,
          [tab]: { blocos: res.blocos, origem: res.origem, loading: false, dirty: false },
        })),
      )
      .catch((err) => {
        toast.error(err?.message ?? "Falha ao carregar preferências");
        setState((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: false } }));
      });
  }, [tab]);

  const current = state[tab];

  function update(fn: (blocos: BlocoPref[]) => BlocoPref[]) {
    setState((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], blocos: fn(prev[tab].blocos), dirty: true },
    }));
  }

  async function onSave() {
    setSaving(true);
    try {
      await save({ data: { metodologia: tab, blocos: current.blocos } });
      toast.success("Preferências salvas");
      setState((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], dirty: false, origem: "custom" },
      }));
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onDiscard() {
    setState((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: true, dirty: false } }));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    update((blocos) => {
      const oldIndex = blocos.findIndex((_, i) => `bloco-${i}` === active.id);
      const newIndex = blocos.findIndex((_, i) => `bloco-${i}` === over.id);
      if (oldIndex < 0 || newIndex < 0) return blocos;
      return arrayMove(blocos, oldIndex, newIndex);
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <header className="mb-8 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Configurações de geração</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Defina, por modalidade, quais blocos, séries, repetições e progressões o motor usa ao gerar
              treinos. A seleção de exercícios continua vindo do seu banco.
            </p>
          </div>
        </div>
      </header>

      <Tabs value={section} onValueChange={(v) => setSection(v as any)} className="mb-8">
        <TabsList className="h-auto w-full max-w-md gap-1 bg-muted/40 p-1">
          <TabsTrigger value="geracao" className="flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Geração automática
          </TabsTrigger>
          <TabsTrigger value="formatos" className="flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Layers className="h-3.5 w-3.5" /> Formatos de bloco
          </TabsTrigger>
        </TabsList>
        <TabsContent value="formatos" className="mt-6 focus-visible:outline-none">
          <FormatosPanel />
        </TabsContent>
        <TabsContent value="geracao" className="mt-6 focus-visible:outline-none">

      <Tabs value={tab} onValueChange={(v) => setTab(v as Methodology)}>
        {/* Mobile: select. Desktop: tabs. */}
        <div className="mb-6 md:hidden">
          <Select value={tab} onValueChange={(v) => setTab(v as Methodology)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {METS.map((m) => (
                <SelectItem key={m} value={m}>{METHODOLOGY_LABEL[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TabsList className="mb-6 hidden h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1 md:flex">
          {METS.map((m) => (
            <TabsTrigger
              key={m}
              value={m}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {METHODOLOGY_LABEL[m]}
            </TabsTrigger>
          ))}
        </TabsList>

        {METS.map((m) => (
          <TabsContent key={m} value={m} className="mt-0 focus-visible:outline-none">
            {m === tab && (
              <MethodologyPanel
                state={current}
                onUpdate={update}
                sensors={sensors}
                onDragEnd={onDragEnd}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Sticky footer */}
      {section === "geracao" && current.dirty && !current.loading && (
        <div className="sticky bottom-4 z-20 mt-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <p className="pl-2 text-xs text-muted-foreground md:text-sm">
              Alterações se aplicam nas próximas gerações.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
                Descartar
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving} className="min-w-[140px]">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ================= Formatos de bloco ================= */

function FormatosPanel() {
  const {
    registry,
    builtins,
    renameBuiltin,
    toggleBuiltin,
    addCustom,
    updateCustom,
    removeCustom,
  } = useFormatRegistry();

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Formatos padrão
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Renomeie ou oculte o que aparece no menu "Adicionar bloco".
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {builtins.map((p) => {
            const hidden = registry.hidden.includes(p.base);
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border/60 bg-card p-3 transition-colors",
                  hidden && "opacity-60",
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </div>
                <Input
                  className="h-9 flex-1"
                  value={p.label}
                  onChange={(e) => renameBuiltin(p.base, e.target.value)}
                  placeholder={BLOCK_FORMAT_LABEL[p.base]}
                />
                {registry.labels[p.base] && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => renameBuiltin(p.base, "")}
                    aria-label="Restaurar nome"
                    title="Restaurar nome padrão"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => toggleBuiltin(p.base, hidden)}
                  aria-label={hidden ? "Mostrar" : "Ocultar"}
                  title={hidden ? "Mostrar no menu" : "Ocultar do menu"}
                >
                  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Meus formatos
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Presets rápidos com título e defaults, baseados num formato existente.
            </p>
          </div>
          <NovoFormatoButton onCreate={addCustom} />
        </div>
        {registry.custom.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 border-dashed py-10 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Pencil className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">Nenhum preset ainda</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Crie variações como "AMRAP 15'" ou "Força 5×5" que aparecem no menu do construtor.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {registry.custom.map((p) => (
              <CustomFormatoRow
                key={p.id}
                preset={p}
                onChange={(patch) => updateCustom(p.id, patch)}
                onRemove={() => removeCustom(p.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NovoFormatoButton({
  onCreate,
}: {
  onCreate: (p: { label: string; base: BlockFormat; defaults?: Record<string, any> }) => void;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={() =>
        onCreate({
          label: "Novo formato",
          base: "amrap",
          defaults: { duracao_min: 12 },
        })
      }
    >
      <Plus className="h-4 w-4" /> Novo formato
    </Button>
  );
}

function CustomFormatoRow({
  preset,
  onChange,
  onRemove,
}: {
  preset: { id: string; label: string; base: BlockFormat; defaults?: Record<string, any> };
  onChange: (patch: Partial<{ label: string; base: BlockFormat; defaults: Record<string, any> }>) => void;
  onRemove: () => void;
}) {
  const defaults = preset.defaults ?? {};
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-9 min-w-[160px] flex-1 font-medium"
          value={preset.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Nome do preset"
        />
        <Select value={preset.base} onValueChange={(v) => onChange({ base: v as BlockFormat })}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENABLED_FORMATS.map((f) => (
              <SelectItem key={f} value={f}>{BLOCK_FORMAT_LABEL[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
          aria-label="Remover preset"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DefaultField
          label="Rounds"
          value={defaults.rounds}
          onChange={(v) => onChange({ defaults: { ...defaults, rounds: v } })}
        />
        <DefaultField
          label="Duração (min)"
          value={defaults.duracao_min}
          onChange={(v) => onChange({ defaults: { ...defaults, duracao_min: v } })}
        />
        <DefaultField
          label="Intervalo (min)"
          value={defaults.intervalo_min}
          step="0.5"
          onChange={(v) => onChange({ defaults: { ...defaults, intervalo_min: v } })}
        />
        <DefaultField
          label="Reps por ex."
          value={defaults.reps}
          onChange={(v) => onChange({ defaults: { ...defaults, reps: v } })}
        />
      </div>
    </div>
  );
}

function DefaultField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: any;
  onChange: (v: number | null) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        step={step}
        value={value ?? ""}
        min={0}
        className="h-8"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder="—"
      />
    </div>
  );
}

function MethodologyPanel({
  state,
  onUpdate,
  sensors,
  onDragEnd,
}: {
  state: State[Methodology];
  onUpdate: (fn: (blocos: BlocoPref[]) => BlocoPref[]) => void;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
}) {
  if (state.loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando preferências…
      </div>
    );
  }

  const ids = state.blocos.map((_, i) => `bloco-${i}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={state.origem === "custom" ? "default" : "secondary"} className="gap-1">
            <Sparkles className="h-3 w-3" />
            {state.origem === "custom" ? "Preferências personalizadas" : "Usando templates padrão"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {state.blocos.length} {state.blocos.length === 1 ? "bloco" : "blocos"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdate((b) => [...b, novoBloco()])}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Adicionar bloco
        </Button>
      </div>

      {state.blocos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum bloco configurado</p>
            <p className="mt-1 text-xs text-muted-foreground">Adicione blocos para personalizar essa modalidade.</p>
          </div>
          <Button size="sm" onClick={() => onUpdate((b) => [...b, novoBloco()])} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar bloco
          </Button>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {state.blocos.map((bloco, i) => (
                <SortableBloco
                  key={`bloco-${i}`}
                  id={`bloco-${i}`}
                  index={i}
                  bloco={bloco}
                  onChange={(next) => onUpdate((b) => b.map((x, j) => (j === i ? next : x)))}
                  onRemove={() => onUpdate((b) => b.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableBloco({
  id, index, bloco, onChange, onRemove,
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
          {/* Linha 1: formato + título */}
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Formato</Label>
              <Select value={bloco.formato} onValueChange={(v) => onChange({ ...bloco, formato: v as BlockFormat })}>
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

          {/* Linha 2: numéricos */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <NumField label="Duração (min)" value={bloco.duracao_min ?? 0} min={0} max={180}
              onChange={(n) => onChange({ ...bloco, duracao_min: n || null })} />
            <NumField label="Exercícios" value={bloco.num_exercicios} min={1} max={20}
              onChange={(n) => onChange({ ...bloco, num_exercicios: Math.max(1, n) })} />
            <NumField label="Séries" value={bloco.series} min={1} max={20}
              onChange={(n) => onChange({ ...bloco, series: Math.max(1, n) })} />
            <NumField label="Reps base" value={bloco.reps_base} min={1} max={100}
              onChange={(n) => onChange({ ...bloco, reps_base: Math.max(1, n) })} />
          </div>

          {/* Avançado */}
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
                    <NumField label="Tempo trabalho (s)" value={bloco.tempo_trabalho ?? 0} min={0} max={600}
                      onChange={(n) => onChange({ ...bloco, tempo_trabalho: n || null })} />
                    <NumField label="Tempo descanso (s)" value={bloco.tempo_descanso ?? 0} min={0} max={600}
                      onChange={(n) => onChange({ ...bloco, tempo_descanso: n || null })} />
                  </div>
                )}
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

function NumField({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
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

function RepsPattern({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
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

function PassosPct({
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
              <NumField label={i === 0 ? "%1RM" : ""} value={p.pct} min={0} max={100}
                onChange={(n) => onChange(value.map((x, j) => (j === i ? { ...x, pct: n } : x)))} />
              <NumField label={i === 0 ? "Séries" : ""} value={p.sets} min={1} max={20}
                onChange={(n) => onChange(value.map((x, j) => (j === i ? { ...x, sets: n } : x)))} />
              <NumField label={i === 0 ? "Reps" : ""} value={p.reps} min={1} max={50}
                onChange={(n) => onChange(value.map((x, j) => (j === i ? { ...x, reps: n } : x)))} />
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