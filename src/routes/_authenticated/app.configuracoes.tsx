import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Database,
  ShieldAlert,
} from "lucide-react";
import { Copy, Wand2 } from "lucide-react";
import { Palette, FolderArchive, KeyRound, Link } from "lucide-react";
import { ApiPanel } from "@/components/settings/api-panel";
import { MarcaPanel } from "@/components/settings/marca-panel";
import { ArquivosPanel } from "@/components/settings/arquivos-panel";
import { SettingsHeader, Fold, DiagnosticPanel } from "@/components/settings/settings-shell";
import { KpiRow, type Kpi } from "@/components/settings/kpi-row";
import { useCoachFiles, formatBytes } from "@/components/settings/use-coach-files";
import { useCoach } from "@/hooks/use-coach";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FormatPreset } from "@/lib/format-registry";
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
import { Search, ListChecks, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dumbbell, Activity, Wrench, Wind } from "lucide-react";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  validateSearch: (search: Record<string, unknown>) => ({
    section: typeof search.section === "string" ? search.section : undefined,
  }),
  component: ConfiguracoesPage,
});

const SECTIONS = [
  {
    key: "geracao",
    label: "Geração & Blocos",
    hint: "Motor automático, formatos e API",
    icon: Sparkles,
  },
  { key: "marca", label: "Marca", hint: "Logo, cores e rodapé", icon: Palette },
  { key: "arquivos", label: "Arquivos", hint: "Planilhas, PDFs e mídias", icon: FolderArchive },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

/** Links antigos (?section=formatos|fusao|api) continuam funcionando. */
const LEGACY_SECTION: Record<string, SectionKey> = {
  formatos: "geracao",
  fusao: "geracao",
  api: "geracao",
};

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
  const searchSection = Route.useSearch().section;
  const navigate = useNavigate({ from: Route.fullPath });
  const load = useServerFn(getGeneratorPrefs);
  const save = useServerFn(saveGeneratorPrefs);
  const [state, setState] = useState<State>(makeEmpty);
  const [tab, setTab] = useState<Methodology>("hibrido");
  const [saving, setSaving] = useState(false);
  const section: SectionKey = SECTIONS.some((s) => s.key === searchSection)
    ? (searchSection as SectionKey)
    : (LEGACY_SECTION[searchSection ?? ""] ?? "geracao");

  const { presets } = useFormatRegistry();
  const { data: coach } = useCoach();
  const { data: files = [], isLoading: filesLoading } = useCoachFiles();

  function setSection(next: SectionKey) {
    navigate({ search: { section: next }, replace: true });
  }

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

  const totalBytes = files.reduce((acc, f) => acc + (f.metadata?.size ?? 0), 0);
  const lastUpload = files[0]?.created_at
    ? new Date(files[0].created_at as string).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "—";

  const kpis: Kpi[] =
    section === "marca"
      ? [
          {
            label: "Logo",
            value: coach?.logo_url ? "Enviada" : "Pendente",
            hint: "Cabeçalho das exportações",
            icon: Palette,
          },
          {
            label: "Cor primária",
            value: (coach?.cor_primaria ?? "#F26B1F").toUpperCase(),
            swatch: coach?.cor_primaria ?? "#F26B1F",
          },
          {
            label: "Cor secundária",
            value: (coach?.cor_secundaria ?? "#0F1115").toUpperCase(),
            swatch: coach?.cor_secundaria ?? "#0F1115",
          },
          {
            label: "Rodapé",
            value: coach?.rodape_export ? "Definido" : "Vazio",
            hint: coach?.rodape_export ?? "Pé de página das exportações",
          },
        ]
      : section === "arquivos"
        ? [
            { label: "Arquivos", value: String(files.length), icon: FolderArchive },
            { label: "Espaço usado", value: formatBytes(totalBytes) },
            { label: "Último envio", value: lastUpload, hint: "Data do upload mais recente" },
          ]
        : [
            {
              label: "Modalidade",
              value: METHODOLOGY_LABEL[tab],
              icon: Sparkles,
            },
            { label: "Blocos", value: String(current.blocos.length), hint: "Na modalidade ativa" },
            {
              label: "Preferências",
              value: current.origem === "custom" ? "Personalizadas" : "Padrão",
            },
            { label: "Formatos ativos", value: String(presets.length), icon: Layers },
          ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <SettingsHeader
        icon={Settings}
        eyebrow="Conta"
        title="Configurações"
        description="Preferências do motor de geração, identidade visual e materiais do seu trabalho."
      />

      <nav
        role="tablist"
        aria-label="Seções de configurações"
        className="-mx-4 mb-8 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:inline-flex md:snap-none md:gap-1 md:rounded-xl md:border md:border-border/60 md:bg-muted/40 md:p-1 md:px-1"
      >
        {SECTIONS.map((s) => {
          const active = section === s.key;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(s.key)}
              className={cn(
                "group flex shrink-0 snap-start items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
                active
                  ? "border-primary/40 bg-background text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
          );
        })}
      </nav>

      <KpiRow items={kpis} loading={section === "arquivos" ? filesLoading : false} />

      <div className="min-w-0 space-y-6">
        {section === "marca" && (
          <Fold
            title="Marca do treinador"
            description="Logo, cores e rodapé aplicados no cabeçalho das exportações em PDF, Excel e imagem."
          >
            <MarcaPanel />
          </Fold>
        )}
        {section === "arquivos" && (
          <Fold
            title="Seus arquivos"
            description="Envie e baixe planilhas, PDFs, mídias e outros materiais do seu trabalho."
          >
            <ArquivosPanel />
          </Fold>
        )}
        {section === "geracao" && (
          <>
            <Fold
              title="Geração automática"
              description="Blocos, séries e progressões usados pelo motor em cada modalidade."
            >
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
                <KbFitnessPanel state={current} onUpdate={update} />
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
              {current.dirty && !current.loading && (
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
            </Fold>

            <Fold>
              <SetTypesPanel />
            </Fold>

            <Fold>
              <FormatosPanel />
            </Fold>

            <Fold>
              <ApiPanel />
            </Fold>

            <Fold title="Diagnóstico de Sistema" description="Informações técnicas para suporte e depuração.">
              <DiagnosticPanel />
            </Fold>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= Formatos de bloco ================= */

type KbCategoria = "Kettlebell" | "Ginásticos" | "Dumbbell" | "Barbell" | "Objetos Alternativos";

const KB_CATEGORIAS: {
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

function ensureKbBloco(blocos: BlocoPref[]): BlocoPref {
  if (blocos.length > 0) return blocos[0];
  return {
    formato: "kb_timed_sets",
    titulo: "Kettlebell Fitness",
    duracao_min: null,
    num_exercicios: 6,
    series: 6,
    reps_base: 12,
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

function KbFitnessPanel({
  state,
  onUpdate,
}: {
  state: State[Methodology];
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

function OverrideRow({
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

function PrepMovimentoCard({
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

function SlotCounter({
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

function NumberRow({
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

function StatChip({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 transition-colors hover:border-border">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-base font-semibold tabular-nums text-foreground">{value}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

function FormatosPanel() {
  const {
    builtins,

    presets,
    renameBuiltin,
    describeBuiltin,
    setBuiltinDefaults,
    resetBuiltin,
    toggleBuiltin,
    addCustom,
    updateCustom,
    removePreset,
    duplicatePreset,
    reorderPresets,
  } = useFormatRegistry();

  const [editing, setEditing] = useState<FormatPreset | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<FormatPreset | null>(null);

  const hiddenBuiltins = builtins.filter((p) => !presets.find(pr => pr.id === p.id));
  const activeCount = presets.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorderPresets(String(active.id), String(over.id));
  }

  function confirmedDelete() {
    if (!confirmDelete) return;
    removePreset(confirmDelete.id);
    setConfirmDelete(null);
  }

  function openNew() {
    setEditing({
      id: "",
      label: "",
      base: "bodybuilding_sets",
      description: "",
      defaults: { series: 4, reps: "8-12", descanso_seg: 60 },
      builtin: false,
    });
  }

  function handleSave(next: FormatPreset) {
    if (next.builtin) {
      // Salva tudo em uma única operação, incluindo a estrutura (base) do bloco.
      saveBuiltin(next.id, {
        label: next.label,
        base: next.base,
        description: next.description,
        defaults: next.defaults,
      });
    } else if (!next.id) {
      addCustom({
        label: next.label || "Novo formato",
        base: next.base,
        description: next.description,
        defaults: next.defaults,
      });
    } else {
      updateCustom(next.id, {
        label: next.label,
        base: next.base,
        description: next.description,
        defaults: next.defaults,
      });
    }
    setEditing(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Formatos de bloco
          </h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Edite, oculte ou crie variações dos blocos que aparecem no construtor manual
            e nas preferências de geração automática.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-6 gap-1 rounded-full px-2.5 text-[11px] font-medium">
            <Sparkles className="h-3 w-3" /> {activeCount} ativos
          </Badge>
          {hiddenBuiltins.length > 0 && (
            <Badge variant="outline" className="h-6 gap-1 rounded-full px-2.5 text-[11px] font-medium">
              <EyeOff className="h-3 w-3" /> {hiddenBuiltins.length} ocultos
            </Badge>
          )}
          <Button size="sm" className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo formato
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={presets.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {presets.map((p) => (
                <FormatoCard
                  key={p.id}
                  preset={p}
                  customized={false}

                  onEdit={() => setEditing(p)}
                  onDuplicate={async () => {
                    const id = await duplicatePreset(p);
                    const newPreset = presets.find(pr => pr.id === id);
                    if (newPreset) setEditing(newPreset);
                  }}


                  onReset={p.builtin ? () => resetBuiltin(p.base) : undefined}
                  onDelete={() => setConfirmDelete(p)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {activeCount === 0 && (
          <Card className="flex flex-col items-center justify-center gap-2 border-dashed py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">Nenhum formato ativo</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Todos os formatos estão ocultos. Reative um abaixo ou crie um novo.
            </p>
          </Card>
        )}
      </section>

      {hiddenBuiltins.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="group flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            {showHidden ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Blocos ocultos ({hiddenBuiltins.length})
          </button>
          {showHidden && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {hiddenBuiltins.map((p) => (
                <FormatoCard
                  key={p.id}
                  preset={p}
                  hidden
                  customized={false}

                  onEdit={() => setEditing(p)}
                  onShow={() => toggleBuiltin(p.base, true)}
                  onReset={() => resetBuiltin(p.base)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <FormatoEditorDialog
        open={!!editing}
        preset={editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSave={handleSave}
        onDelete={(id) => {
          const p = presets.find(x => x.id === id) || builtins.find(x => x.id === id);
          if (p) setConfirmDelete(p);
        }}
      />

      <DeleteFormatDialog
        preset={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmedDelete}
      />
    </div>
  );
}

/* ============ Cards + Editor de formato ============ */

function FormatoCard({
  preset,
  hidden,
  customized,
  onEdit,
  onDuplicate,
  onShow,
  onReset,
  onDelete,
}: {
  preset: FormatPreset;
  hidden?: boolean;
  customized?: boolean;
  onEdit: () => void;
  onDuplicate?: () => void;
  onShow?: () => void;
  onReset?: () => void;
  onDelete?: () => void;
}) {
  const defaults = preset.defaults ?? {};
  const chips: { label: string; value: string }[] = [];
  if (defaults.rounds) chips.push({ label: "Rounds", value: String(defaults.rounds) });
  if (defaults.duracao_min) chips.push({ label: "Min", value: String(defaults.duracao_min) });
  if (defaults.intervalo_min) chips.push({ label: "Int", value: `${defaults.intervalo_min}′` });
  if (defaults.reps) chips.push({ label: "Reps", value: String(defaults.reps) });
  if (defaults.tempo_seg) chips.push({ label: "Tempo", value: `${defaults.tempo_seg}s` });
  if (defaults.estacoes) chips.push({ label: "Estações", value: String(defaults.estacoes) });

  const sortable = useSortable({ id: preset.id, disabled: hidden });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;
  const style = hidden
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  return (
    <Card
      ref={hidden ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border-border/60 bg-card/60 p-5 backdrop-blur transition-all duration-200",
        "hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_8px_24px_-12px_hsl(var(--primary)/0.25)]",
        hidden && "opacity-70",
        isDragging && "z-10 scale-[1.02] shadow-lg ring-1 ring-primary/40",
      )}
    >
      {!hidden && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-all duration-150 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 md:opacity-0 touch-none cursor-grab active:cursor-grabbing"
          aria-label={`Arrastar para reordenar ${preset.label}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            preset.builtin ? "bg-primary/10 text-primary" : "bg-accent/40 text-accent-foreground",
          )}
        >
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {preset.label}
            </h3>
            {!preset.builtin && (
              <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[10px] font-medium">
                Preset
              </Badge>
            )}
            {customized && preset.builtin && (
              <Badge variant="outline" className="h-5 gap-1 rounded-full border-primary/40 px-1.5 text-[10px] font-medium text-primary">
                <Wand2 className="h-2.5 w-2.5" /> editado
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {BLOCK_FORMAT_LABEL[preset.base]}
          </p>
          {preset.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {preset.description}
            </p>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              <span className="text-[9px] uppercase tracking-wider opacity-70">{c.label}</span>
              <span className="tabular-nums text-foreground">{c.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-1 pt-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <div className="flex items-center gap-0.5">
          {onDuplicate && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground transition-colors hover:text-foreground"
              onClick={onDuplicate}
              aria-label="Duplicar"
              title="Duplicar como preset"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {customized && onReset && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground transition-colors hover:text-foreground"
              onClick={onReset}
              aria-label="Restaurar padrão"
              title="Restaurar padrão"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          {onShow && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={onShow}
              aria-label="Restaurar"
              title="Restaurar no grid"
            >
              <Eye className="h-3.5 w-3.5" /> Restaurar
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 transition-colors",
                preset.builtin
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              )}
              onClick={onDelete}
              aria-label={preset.builtin ? "Ocultar" : "Excluir"}
              title={preset.builtin ? "Ocultar do menu" : "Excluir preset"}
            >
              {preset.builtin ? <EyeOff className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function DeleteFormatDialog({
  preset,
  onCancel,
  onConfirm,
}: {
  preset: FormatPreset | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = !!preset;
  const isBuiltin = !!preset?.builtin;
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBuiltin ? "Ocultar bloco padrão?" : "Excluir bloco personalizado?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {isBuiltin ? (
              <>
                <span className="font-medium text-foreground">{preset?.label}</span> vai
                sair do grid e do menu do construtor. Você pode restaurá-lo depois em
                "Blocos ocultos".
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">{preset?.label}</span> será
                removido permanentemente. Essa ação não pode ser desfeita.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              !isBuiltin &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {isBuiltin ? "Ocultar" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FormatoEditorDialog({
  open,
  preset,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean;
  preset: FormatPreset | null;
  onOpenChange: (v: boolean) => void;
  onSave: (next: FormatPreset) => void;
  onDelete?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<FormatPreset | null>(null);

  useEffect(() => {
    if (open && preset) setDraft({ ...preset, defaults: { ...(preset.defaults ?? {}) } });
    if (!open) setDraft(null);
  }, [open, preset]);

  if (!draft) return null;
  const isNew = !draft.builtin && !draft.id;
  const defaults = draft.defaults ?? {};

  const setDefault = (key: string, v: number | string | null) => {
    setDraft((d) => (d ? { ...d, defaults: { ...(d.defaults ?? {}), [key]: v } } : d));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {isNew ? "Novo formato" : draft.builtin ? "Editar formato padrão" : "Editar preset"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Aplica ao construtor manual e às preferências do gerador automático.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nome</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder={BLOCK_FORMAT_LABEL[draft.base]}
              className="h-10"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estrutura do bloco
            </Label>
            <Select
              value={draft.base}
              onValueChange={(v) => setDraft({ ...draft, base: v as BlockFormat })}
            >
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENABLED_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>{BLOCK_FORMAT_LABEL[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Define como o bloco é montado e preenchido no construtor (séries × reps, tempo, circuito, %1RM etc.). Editável em qualquer formato, inclusive nos padrões.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Descrição
              <span className="ml-1 normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
            </Label>
            <Textarea
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Ex.: AMRAP curto para finalizar a sessão"
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Valores padrão
            </Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DefaultField
                label="Rounds"
                value={defaults.rounds}
                onChange={(v) => setDefault("rounds", v)}
              />
              <DefaultField
                label="Duração (min)"
                value={defaults.duracao_min}
                onChange={(v) => setDefault("duracao_min", v)}
              />
              <DefaultField
                label="Intervalo (min)"
                value={defaults.intervalo_min}
                step="0.5"
                onChange={(v) => setDefault("intervalo_min", v)}
              />
              <DefaultField
                label="Reps por ex."
                value={defaults.reps}
                onChange={(v) => setDefault("reps", v)}
              />
              <DefaultField
                label="Tempo (seg)"
                value={defaults.tempo_seg}
                onChange={(v) => setDefault("tempo_seg", v)}
              />
              <DefaultField
                label="Estações"
                value={defaults.estacoes}
                onChange={(v) => setDefault("estacoes", v)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Deixe em branco para usar o valor do bloco. Só campos aplicáveis ao formato serão usados.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-border/60 px-6 py-4">
          <div className="flex items-center gap-2">
            {!draft.builtin && draft.id && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onDelete(draft.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir formato
              </Button>
            )}
            {draft.builtin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onDelete!(draft.id);
                  onOpenChange(false);
                }}
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Desativar formato
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => onSave(draft)} disabled={!draft.label.trim()}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Tipos de séries ================= */

import { useSetTypeRegistry, type SetFieldKey, type SetFieldConfig, type SetTypePreset } from "@/lib/set-type-registry";

function SetTypesPanel() {
  const { presets, addCustom, updateCustom, removePreset } = useSetTypeRegistry();
  const [editing, setEditing] = useState<SetTypePreset | null>(null);

  function handleSave(next: SetTypePreset) {
    if (!next.id) {
      addCustom({ label: next.label, fields: next.fields });
    } else {
      updateCustom(next.id, { label: next.label, fields: next.fields });
    }
    setEditing(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Tipos de séries
          </h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Crie novos tipos de séries (Ex: Repetições e Potência) definindo quais campos o treinador deve preencher.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setEditing({ id: "", label: "", fields: [{ key: "serie_rep", label: "Série/rep" }] })}>
          <Plus className="h-4 w-4" /> Novo tipo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => (
          <Card key={p.id} className="relative overflow-hidden border-border/60 bg-card p-4 transition-all hover:border-primary/40">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{p.label}</h3>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.fields.map((f) => (
                    <Badge key={f.key} variant="outline" className="text-[10px] uppercase tracking-wide">
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)}>
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removePreset(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
            </div>
            {p.builtin && (
              <Badge variant="secondary" className="absolute right-2 top-2 h-5 text-[9px] uppercase tracking-tighter opacity-40">
                Padrão
              </Badge>
            )}
          </Card>
        ))}
      </div>

      {editing && (
        <SetTypeEditorDialog
          preset={editing}
          onSave={handleSave}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

const FIELD_OPTIONS: { key: SetFieldKey; label: string }[] = [
  { key: "serie_rep", label: "Série/Rep" },
  { key: "carga", label: "Carga (kg)" },
  { key: "tempo_seg", label: "Tempo (s)" },
  { key: "intervalo_seg", label: "Intervalo (s)" },
  { key: "inclinacao_pct", label: "Inclinação (%)" },
  { key: "distancia", label: "Distância" },
  { key: "ritmo", label: "Ritmo" },
  { key: "cadencia", label: "Cadência" },
  { key: "obs", label: "Observações" },
];

function SetTypeEditorDialog({
  preset,
  onSave,
  onOpenChange,
}: {
  preset: SetTypePreset;
  onSave: (next: SetTypePreset) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<SetTypePreset>(preset);

  function toggleField(key: SetFieldKey) {
    const exists = draft.fields.find((f) => f.key === key);
    if (exists) {
      setDraft({ ...draft, fields: draft.fields.filter((f) => f.key !== key) });
    } else {
      const option = FIELD_OPTIONS.find((o) => o.key === key)!;
      setDraft({ ...draft, fields: [...draft.fields, { key, label: option.label }] });
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{preset.id ? "Editar tipo" : "Novo tipo de série"}</DialogTitle>
          <DialogDescription>
            Escolha as colunas que estarão disponíveis para este tipo de série.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label>Nome do tipo</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Ex: Repetições e Potência"
            />
          </div>

          <div className="space-y-2">
            <Label>Colunas disponíveis</Label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_OPTIONS.map((opt) => {
                const active = draft.fields.some((f) => f.key === opt.key);
                return (
                  <Button
                    key={opt.key}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className="h-9 justify-start text-xs"
                    onClick={() => toggleField(opt.key)}
                  >
                    <Check className={cn("mr-2 h-3 w-3 opacity-0 transition-opacity", active && "opacity-100")} />
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(draft)} disabled={!draft.label.trim() || draft.fields.length === 0}>
            Salvar tipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        className="h-9"
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
              <Select value={bloco.formato} onValueChange={(v) => onChange({ ...bloco, formato: v as any })}>
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