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
  listEquipamentos,
  countExercicios,
  searchExercicios,
  getExerciciosByIds,
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
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ListChecks } from "lucide-react";

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
    modalidades_alvo: [],
    equipamentos_alvo: [],
    exercicios_permitidos: [],
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
              m === "kettlebell_fitness" ? (
                <KbFitnessAutoPanel />
              ) : (
                <MethodologyPanel
                  state={current}
                  onUpdate={update}
                  sensors={sensors}
                  onDragEnd={onDragEnd}
                />
              )
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Sticky footer */}
      {section === "geracao" && current.dirty && !current.loading && (
        tab !== "kettlebell_fitness" && (
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
        )
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

function TargetingSection({
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

          {/* Direcionamento: modalidades + equipamentos */}
          <TargetingSection bloco={bloco} onChange={onChange} />

          {/* Curadoria manual de exercícios */}
          <CurationSection bloco={bloco} onChange={onChange} />

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

/* ================= Curadoria manual de exercícios ================= */

function CurationSection({
  bloco,
  onChange,
}: {
  bloco: BlocoPref;
  onChange: (b: BlocoPref) => void;
}) {
  const [open, setOpen] = useState(false);
  const permitidos = bloco.exercicios_permitidos ?? [];
  const ativo = permitidos.length > 0;

  const hidratados = useQuery({
    queryKey: ["curated-names", permitidos.slice().sort().join("|")],
    queryFn: () => getExerciciosByIds({ data: { ids: permitidos } }),
    enabled: ativo,
    staleTime: 30_000,
  });

  const nomes = hidratados.data ?? [];
  const preview = nomes.slice(0, 3);
  const resto = Math.max(0, permitidos.length - preview.length);

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4 transition-colors",
        ativo
          ? "border-primary/30 bg-primary/[0.03]"
          : "border-border/50 bg-muted/20",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            Pool de exercícios
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {ativo
              ? "O motor sorteia só dos exercícios curados abaixo — filtros de modalidade e equipamento ficam ignorados."
              : "Sem curadoria — o motor usa modalidade + equipamento do bloco."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ativo && (
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 font-medium tabular-nums text-primary"
            >
              {permitidos.length} curado{permitidos.length === 1 ? "" : "s"}
            </Badge>
          )}
          <Button
            type="button"
            variant={ativo ? "outline" : "default"}
            size="sm"
            className="gap-1.5"
            onClick={() => setOpen(true)}
          >
            <ListChecks className="h-3.5 w-3.5" />
            {ativo ? "Editar pool" : "Curar exercícios"}
          </Button>
        </div>
      </div>

      {ativo && (
        <div className="flex flex-wrap items-center gap-1.5">
          {hidratados.isLoading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando nomes…
            </span>
          ) : (
            <>
              {preview.map((ex) => (
                <Badge
                  key={ex.id}
                  variant="secondary"
                  className="max-w-[220px] truncate border-border/60 bg-background font-normal"
                  title={ex.nome_pt}
                >
                  {ex.nome_pt}
                </Badge>
              ))}
              {resto > 0 && (
                <Badge
                  variant="secondary"
                  className="border-border/60 bg-background font-normal tabular-nums text-muted-foreground"
                >
                  +{resto}
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onChange({ ...bloco, exercicios_permitidos: [] })}
              >
                <RotateCcw className="h-3 w-3" />
                Voltar ao automático
              </Button>
            </>
          )}
        </div>
      )}

      <CurationSheet
        open={open}
        onOpenChange={setOpen}
        selectedIds={permitidos}
        onSave={(ids) => onChange({ ...bloco, exercicios_permitidos: ids })}
      />
    </div>
  );
}

function CurationSheet({
  open,
  onOpenChange,
  selectedIds,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  onSave: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [mods, setMods] = useState<Methodology[]>([]);
  const [equips, setEquips] = useState<string[]>([]);
  const [somenteMeus, setSomenteMeus] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    if (open) setDraft(new Set(selectedIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const equipQuery = useQuery({
    queryKey: ["equipamentos"],
    queryFn: () => listEquipamentos(),
    staleTime: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ["curation-search", debouncedQ, mods.slice().sort().join("|"), equips.slice().sort().join("|"), somenteMeus],
    queryFn: () =>
      searchExercicios({
        data: {
          query: debouncedQ,
          modalidades: mods,
          equipamentos: equips,
          somente_meus: somenteMeus,
          limit: 300,
        },
      }),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const items = listQuery.data ?? [];
  const visibleIds = useMemo(() => items.map((x) => x.id), [items]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => draft.has(id));

  function toggle(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }
  function unselectAllVisible() {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) next.delete(id);
      return next;
    });
  }

  function commit() {
    onSave(Array.from(draft));
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            Curar pool de exercícios
          </SheetTitle>
          <SheetDescription className="text-xs">
            Escolha manualmente os exercícios que o motor pode sortear neste bloco.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 border-b border-border/60 bg-muted/20 px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome…"
              className="h-10 pl-9"
              aria-label="Buscar exercícios"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(METHODOLOGY_LABEL) as Methodology[]).map((m) => {
              const active = mods.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setMods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
                  }
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-all duration-200",
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

          {(equipQuery.data ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(equipQuery.data ?? []).map((eq) => {
                const active = equips.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() =>
                      setEquips((prev) =>
                        prev.includes(eq) ? prev.filter((x) => x !== eq) : [...prev, eq],
                      )
                    }
                    className={cn(
                      "inline-flex h-7 items-center rounded-full border px-2.5 text-xs capitalize transition-all duration-200",
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

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={somenteMeus}
                onCheckedChange={(v) => setSomenteMeus(v === true)}
              />
              Somente meus exercícios
            </label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={allVisibleSelected ? unselectAllVisible : selectAllVisible}
                disabled={visibleIds.length === 0}
              >
                {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
              </Button>
              {draft.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setDraft(new Set())}
                >
                  Limpar seleção
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-3 py-2">
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium">Nenhum exercício encontrado</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Ajuste os filtros ou a busca.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {items.map((ex) => {
                  const checked = draft.has(ex.id);
                  return (
                    <li key={ex.id}>
                      <button
                        type="button"
                        onClick={() => toggle(ex.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          checked
                            ? "border-primary/40 bg-primary/10"
                            : "border-transparent bg-transparent hover:border-border/60 hover:bg-accent/40",
                        )}
                      >
                        <Checkbox checked={checked} className="pointer-events-none" tabIndex={-1} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{ex.nome_pt}</p>
                          {(ex.metodologias.length > 0 || ex.equipamento.length > 0) && (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {ex.metodologias.map((m) => METHODOLOGY_LABEL[m as Methodology] ?? m).join(" · ")}
                              {ex.metodologias.length > 0 && ex.equipamento.length > 0 ? " — " : ""}
                              {ex.equipamento.join(", ")}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <p className="text-xs tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{draft.size}</span> selecionado{draft.size === 1 ? "" : "s"}
            {items.length > 0 && (
              <span className="ml-1 text-muted-foreground/70">
                · {items.length} visíve{items.length === 1 ? "l" : "is"}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={commit} className="min-w-[100px]">
              Aplicar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}