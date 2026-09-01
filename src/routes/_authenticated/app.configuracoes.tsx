import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Settings,
  Sparkles,
  Layers,
  Palette,
  FolderArchive,
  Loader2,
} from "lucide-react";
import { ApiPanel } from "@/components/settings/api-panel";
import { MarcaPanel } from "@/components/settings/marca-panel";
import { AparenciaPanel } from "@/components/settings/aparencia-panel";
import { ArquivosPanel } from "@/components/settings/arquivos-panel";
import { SettingsHeader, Fold, DiagnosticPanel } from "@/components/settings/settings-shell";
import { KpiRow, type Kpi } from "@/components/settings/kpi-row";
import { useCoachFiles, formatBytes } from "@/components/settings/use-coach-files";
import { useCoach } from "@/hooks/use-coach";
import { useFormatRegistry } from "@/lib/format-registry";
import { getStoredTheme } from "@/lib/theme";
import {
  getGeneratorPrefs,
  saveGeneratorPrefs,
  type BlocoPref,
} from "@/lib/generator-prefs.functions";
import {
  METHODOLOGY_LABEL,
  type Methodology,
} from "@/lib/methodology";
import { cn } from "@/lib/utils";
import { KbFitnessPanel } from "@/components/settings/KbFitnessPanel";
import { FormatosPanel } from "@/components/settings/FormatosPanel";
import { SetTypesPanel } from "@/components/settings/SetTypesPanel";
import { MethodologyPanel } from "@/components/settings/MethodologyPanel";

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
  { key: "aparencia", label: "Aparência", hint: "Tema e visual", icon: Palette },
  { key: "marca", label: "Marca", hint: "Logo, cores e rodapé", icon: Layers },
  { key: "arquivos", label: "Arquivos", hint: "Planilhas, PDFs e mídias", icon: FolderArchive },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

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

  const [activeVisualTheme, setActiveVisualTheme] = useState<ReturnType<typeof getStoredTheme>>("padrao");
  useEffect(() => {
    setActiveVisualTheme(getStoredTheme());
  }, [section]);

  const kpis: Kpi[] =
    section === "aparencia"
      ? [
          {
            label: "Tema ativo",
            value: activeVisualTheme === "pulse" ? "Pulse" : "Padrão",
            icon: Palette,
          },
          {
            label: "Estilo visual",
            value: activeVisualTheme === "pulse" ? "Moderno" : "Clássico",
            hint: "Afeta bordas e cores",
          },
        ]
      : section === "marca"
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
        {section === "aparencia" && (
          <Fold
            title="Aparência do sistema"
            description="Escolha o tema visual que melhor se adapta ao seu estilo de trabalho."
          >
            <AparenciaPanel />
          </Fold>
        )}
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