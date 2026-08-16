import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Plus, Trash2, Sparkles, Hand, Wand2, X } from "lucide-react";
import { SortableList, SortableRow } from "@/components/dnd/sortable-list";
import { ExercisePicker } from "@/components/session-builder/ExercisePicker";
import type {
  BlocoTemplate,
  BlockFormatHibrido,
  HibridoPayload,
  ModalidadeHibrida,
  ModoExecucao,
  SelecaoExercicios,
  SessaoTemplate,
  SlotPreparacao,
} from "@/lib/hibrido-ia.server";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { useFormatRegistry } from "@/lib/format-registry";

const EQUIPAMENTO_VALORES = [
  "Kettlebell",
  "Ginásticos",
  "Dumbbell",
  "Barbell",
  "Mobilidade",
  "Objetos Alternativos",
] as const;

// Mapeamento dinâmico via useFormatRegistry agora cuida das labels
const FORMATO_LABEL: Record<string, string> = {};

function getFormatosDisponiveis(presets: any[]): string[] {
  return presets.map(p => p.id);
}

/** Formatos cujo bloco tem faixa/valor fixo de séries (rounds). */
const USA_SERIES: string[] = [
  "emom",
  "e2mom",
  "circuito",
  "bodybuilding_sets",
  "metcon",
  "finalizador",
];
const USA_INTERVALO: string[] = ["emom", "e2mom"];
const USA_DURACAO_TOTAL: string[] = ["amrap", "preparacao_movimento", "mobilidade"];
const USA_PERCENTUAL: string[] = ["forca_tecnica_pct"];
const USA_DESCANSO_ENTRE_SERIES: string[] = ["circuito", "bodybuilding_sets", "metcon", "finalizador"];
const USA_SLOT: string[] = ["preparacao_movimento"];
const USA_NUMERO_EXERCICIOS = (formato: string) => formato !== "kb_timed_sets";

function gerarChave(formato: BlockFormatHibrido, existentes: BlocoTemplate[]) {
  const base = formato.split("_")[0];
  let n = 1;
  let chave = `${base}_${n}`;
  const usados = new Set(existentes.map((b) => b.chave));
  while (usados.has(chave)) {
    n += 1;
    chave = `${base}_${n}`;
  }
  return chave;
}

function novoBloco(formato: BlockFormatHibrido, existentes: BlocoTemplate[], presets: any[]): BlocoTemplate {
  const chave = gerarChave(formato, existentes);
  const base: BlocoTemplate = {
    chave,
    formato,
    titulo: null,
    duracaoMin: 9,
    seriesMin: 3,
    seriesMax: 3,
    numeroExercicios: 2,
    repsPorExercicio: 12,
    modoExecucao: "circuito",
    descansoAposSeg: 0,
    descansoEntreSeriesSeg: null,
    intervaloMin: null,
    percentual1rm: null,
    selecaoExercicios: "ia",
    exerciciosFixos: [],
    slot: null,
    fonteExercicios: {},
  };

  // Formatos base para presets dinâmicos
  const formatoBase = presets.find(p => p.id === formato)?.base || formato;

  switch (formatoBase) {
    case "preparacao_movimento":
      return { ...base, titulo: "Mobilidade", duracaoMin: 2, numeroExercicios: 1, seriesMin: 4, seriesMax: 4, slot: "mobilidade" };
    case "forca_tecnica_pct":
      return {
        ...base,
        duracaoMin: 8,
        seriesMin: 6,
        seriesMax: 6,
        numeroExercicios: 1,
        repsPorExercicio: 6,
        percentual1rm: 70,
      };
    case "emom":
      return { ...base, duracaoMin: 9, seriesMin: 9, seriesMax: 9, intervaloMin: 1, numeroExercicios: 2 };
    case "e2mom":
      return { ...base, duracaoMin: 16, seriesMin: 8, seriesMax: 8, intervaloMin: 2, numeroExercicios: 2 };
    case "amrap":
      return { ...base, duracaoMin: 12, seriesMin: null, seriesMax: null, numeroExercicios: 3 };
    case "kb_timed_sets":
      return {
        ...base,
        duracaoMin: 10,
        seriesMin: null,
        seriesMax: null,
        numeroExercicios: 1,
        selecaoExercicios: "manual",
      };
    case "finalizador":
      return { ...base, duracaoMin: 2, seriesMin: 1, seriesMax: 1, numeroExercicios: 1 };
    default:
      return base;
  }
}

function novoAquecimento(existentes: BlocoTemplate[], modalidade: ModalidadeHibrida): BlocoTemplate {
  const chave = gerarChave("circuito", existentes);
  return {
    chave,
    formato: "circuito",
    titulo: "Aquecimento",
    duracaoMin: 5,
    seriesMin: 4,
    seriesMax: 4,
    numeroExercicios: 2,
    repsPorExercicio: 10,
    modoExecucao: "circuito",
    descansoAposSeg: 0,
    descansoEntreSeriesSeg: 30,
    selecaoExercicios: "ia",
    exerciciosFixos: [],
    fonteExercicios: { metodologias: [modalidade] },
  };
}

function resumoBloco(b: BlocoTemplate): string {
  const partes: string[] = [];
  if (b.duracaoMin) partes.push(`${b.duracaoMin}'`);
  if (USA_SERIES.includes(b.formato) && b.seriesMin != null) {
    partes.push(b.seriesMin === b.seriesMax ? `${b.seriesMin} séries` : `${b.seriesMin}-${b.seriesMax} séries`);
  }
  if (USA_INTERVALO.includes(b.formato) && b.intervaloMin != null) {
    partes.push(`a cada ${b.intervaloMin}'`);
  }
  if (USA_PERCENTUAL.includes(b.formato) && b.percentual1rm != null) {
    partes.push(`${b.percentual1rm}% 1RM`);
  }
  if (USA_NUMERO_EXERCICIOS(b.formato)) {
    partes.push(`${b.numeroExercicios} exerc.`);
  }
  if (b.repsPorExercicio) partes.push(`${b.repsPorExercicio} reps`);
  partes.push(b.selecaoExercicios === "ia" ? "seleção IA" : "seleção manual");
  if (b.descansoAposSeg > 0) partes.push(`descanso depois: ${b.descansoAposSeg}s`);
  return partes.join(" · ");
}


function CampoNumero({
  label,
  value,
  onChange,
  suffix,
  min = 0,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  suffix?: string;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={min}
          className="h-9 tabular-nums"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function BlocoConfigForm({
  bloco,
  onChange,
  formatLabel,
}: {
  bloco: BlocoTemplate;
  onChange: (patch: Partial<BlocoTemplate>) => void;
  formatLabel: (f: string) => string;
}) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Título do bloco — opcional</Label>
          <Input
            className="h-9"
            placeholder={formatLabel(bloco.formato)}
            value={bloco.titulo ?? ""}
            onChange={(e) => onChange({ titulo: e.target.value || null })}
          />
        </div>

        <CampoNumero
          label={USA_DURACAO_TOTAL.includes(bloco.formato) ? "Duração total" : "Teto de tempo"}
          value={bloco.duracaoMin}
          onChange={(v) => onChange({ duracaoMin: v })}
          suffix="min"
        />

        {USA_SERIES.includes(bloco.formato) && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Séries / rounds</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                className="h-9 w-16 tabular-nums"
                value={bloco.seriesMin ?? ""}
                onChange={(e) => onChange({ seriesMin: e.target.value ? Number(e.target.value) : null })}
              />
              <span className="text-xs text-muted-foreground">a</span>
              <Input
                type="number"
                min={1}
                className="h-9 w-16 tabular-nums"
                value={bloco.seriesMax ?? ""}
                onChange={(e) => onChange({ seriesMax: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>
        )}

        {USA_INTERVALO.includes(bloco.formato) && (
          <CampoNumero
            label="Intervalo de cada ciclo"
            value={bloco.intervaloMin}
            onChange={(v) => onChange({ intervaloMin: v })}
            suffix="min"
          />
        )}

        {USA_PERCENTUAL.includes(bloco.formato) && (
          <CampoNumero
            label="Percentual de 1RM"
            value={bloco.percentual1rm}
            onChange={(v) => onChange({ percentual1rm: v })}
            suffix="%"
          />
        )}

        {USA_NUMERO_EXERCICIOS(bloco.formato) && (
          <CampoNumero
            label="Número de exercícios"
            value={bloco.numeroExercicios}
            onChange={(v) => onChange({ numeroExercicios: v ?? 1 })}
            min={1}
          />
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Reps por exercício</Label>
          <Input
            className="h-9"
            placeholder="12 ou 8-12"
            value={bloco.repsPorExercicio ?? ""}
            onChange={(e) => onChange({ repsPorExercicio: e.target.value || null })}
          />
        </div>

        {USA_DESCANSO_ENTRE_SERIES.includes(bloco.formato) && (
          <CampoNumero
            label="Descanso entre séries"
            value={bloco.descansoEntreSeriesSeg}
            onChange={(v) => onChange({ descansoEntreSeriesSeg: v })}
            suffix="seg"
          />
        )}

        <CampoNumero
          label="Descanso após este bloco"
          value={bloco.descansoAposSeg}
          onChange={(v) => onChange({ descansoAposSeg: v ?? 0 })}
          suffix="seg"
        />

        {USA_SLOT.includes(bloco.formato) && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Slot</Label>
            <Select value={bloco.slot ?? "mobilidade"} onValueChange={(v) => onChange({ slot: v as SlotPreparacao })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobilidade">Mobilidade</SelectItem>
                <SelectItem value="aquecimento">Aquecimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Execução</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={bloco.modoExecucao}
            onValueChange={(v) => v && onChange({ modoExecucao: v as ModoExecucao })}
            className="rounded-md border border-border/60 bg-muted/30 p-0.5"
          >
            <ToggleGroupItem
              value="circuito"
              className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Circuito
            </ToggleGroupItem>
            <ToggleGroupItem
              value="series_fixas"
              className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Séries fixas
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
        <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Seleção de exercícios
        </Label>
        <ToggleGroup
          type="single"
          size="sm"
          value={bloco.selecaoExercicios}
          onValueChange={(v) => v && onChange({ selecaoExercicios: v as SelecaoExercicios })}
          className="mb-3 rounded-md border border-border/60 bg-background p-0.5"
        >
          <ToggleGroupItem
            value="ia"
            className="h-7 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Wand2 className="h-3 w-3" /> IA escolhe
          </ToggleGroupItem>
          <ToggleGroupItem
            value="manual"
            className="h-7 gap-1.5 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Hand className="h-3 w-3" /> Eu escolho
          </ToggleGroupItem>
        </ToggleGroup>

        {bloco.selecaoExercicios === "ia" ? (
          <div className="grid gap-3 sm:grid-cols-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Metodologias de origem</Label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(METHODOLOGY_LABEL) as Methodology[]).map((m) => {
                  const ativo = (bloco.fonteExercicios.metodologias ?? []).includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        const atuais = bloco.fonteExercicios.metodologias ?? [];
                        const proximo = ativo ? atuais.filter((x) => x !== m) : [...atuais, m];
                        onChange({ fonteExercicios: { ...bloco.fonteExercicios, metodologias: proximo } });
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        ativo
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {METHODOLOGY_LABEL[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Equipamento</Label>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPAMENTO_VALORES.map((eq) => {
                  const ativo = (bloco.fonteExercicios.equipamento ?? []).includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => {
                        const atuais = bloco.fonteExercicios.equipamento ?? [];
                        const proximo = ativo ? atuais.filter((x) => x !== eq) : [...atuais, eq];
                        onChange({ fonteExercicios: { ...bloco.fonteExercicios, equipamento: proximo } });
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        ativo
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {eq}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="col-span-full text-[11px] text-muted-foreground">
              Deixe em branco para não filtrar por essa dimensão. A IA escolherá {bloco.numeroExercicios} exercício(s) só
              entre os que baterem com esses filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(bloco.exerciciosFixos ?? []).map((id) => (
                <Badge key={id} variant="secondary" className="gap-1 pr-1 text-[11px]">
                  {id.slice(0, 8)}…
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        exerciciosFixos: (bloco.exerciciosFixos ?? []).filter((x) => x !== id),
                      })
                    }
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <ExercisePicker
              onPick={(ex) =>
                onChange({
                  exerciciosFixos: [...(bloco.exerciciosFixos ?? []), ex.id],
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function BlocoCard({
  bloco,
  aberto,
  onToggle,
  onChange,
  onRemove,
  formatLabel,
}: {
  bloco: BlocoTemplate;
  aberto: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<BlocoTemplate>) => void;
  onRemove: () => void;
  formatLabel: (f: string) => string;
}) {
  return (
    <div className="w-full">
      <Collapsible open={aberto} onOpenChange={onToggle}>
        <div className="flex items-center gap-2 p-3 pr-0">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex flex-1 items-center gap-2 text-left">
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{bloco.titulo || formatLabel(bloco.formato)}</span>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {formatLabel(bloco.formato)}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{resumoBloco(bloco)}</p>
              </div>
            </button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive mr-1"
            onClick={onRemove}
            aria-label="Remover bloco"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CollapsibleContent className="px-3 pb-3">
          <BlocoConfigForm bloco={bloco} onChange={onChange} formatLabel={formatLabel} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export interface ConstrutorMoldeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalidade: ModalidadeHibrida;
  tituloPrograma: string;
  isGenerating?: boolean;
  onGerar: (payload: HibridoPayload, instrucoes: string) => void;
}

const LABEL_MODALIDADE: Record<ModalidadeHibrida, string> = {
  hibrido: "Treinamento Híbrido",
  kettlebell_fitness: "Kettlebell Fitness",
};

export function ConstrutorMoldeDialog({
  open,
  onOpenChange,
  modalidade,
  tituloPrograma,
  isGenerating = false,
  onGerar,
}: ConstrutorMoldeDialogProps) {
  const [numeroSessoes, setNumeroSessoes] = useState(1);
  const [instrucoes, setInstrucoes] = useState("");
  const [blocos, setBlocos] = useState<SessaoTemplate>([]);
  const [abertoChave, setAbertoChave] = useState<string | null>(null);

  function adicionarBloco(formato: BlockFormatHibrido) {
    if (formato === "preparacao_movimento") {
      const mob = novoBloco("preparacao_movimento", blocos);
      const aq = novoAquecimento([...blocos, mob], modalidade);
      // Garante que o bloco de mobilidade tenha o nome correto e o aquecimento também
      mob.titulo = "Mobilidade";
      aq.titulo = "Aquecimento";
      setBlocos((prev) => [...prev, mob, aq]);
      setAbertoChave(mob.chave);
    } else {
      const b = novoBloco(formato, blocos);
      setBlocos((prev) => [...prev, b]);
      setAbertoChave(b.chave);
    }
  }

  function atualizarBloco(chave: string, patch: Partial<BlocoTemplate>) {
    setBlocos((prev) => prev.map((b) => (b.chave === chave ? { ...b, ...patch } : b)));
  }

  function removerBloco(chave: string) {
    setBlocos((prev) => prev.filter((b) => b.chave !== chave));
  }

  function reordenar(activeId: string, overId: string) {
    setBlocos((prev) => {
      const from = prev.findIndex((b) => b.chave === activeId);
      const to = prev.findIndex((b) => b.chave === overId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function limpar() {
    setNumeroSessoes(1);
    setInstrucoes("");
    setBlocos([]);
    setAbertoChave(null);
  }

  function handleGerar() {
    onGerar(
      {
        modalidade,
        tituloPrograma,
        numeroSessoes,
        sessaoTemplate: blocos,
        diasPorSemana: 1, // Placeholder, app.gerar vai sobrescrever se necessário
        dataInicio: new Date().toISOString(), // Placeholder
      },
      instrucoes,
    );
  }


  const { presets: allPresets } = useFormatRegistry();
  const formatosDisponiveis = getFormatosDisponiveis(allPresets);

  const getFormatLabel = (f: string) => {
    const p = allPresets.find(p => p.id === f || `builtin:${p.base}` === f);
    return p?.label ?? f;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) limpar();
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            Construtor de molde
            <Badge variant="secondary" className="ml-1 text-[10px] uppercase tracking-wide">
              {LABEL_MODALIDADE[modalidade]}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Monte a estrutura fixa de blocos da sessão. A IA só escolhe quais exercícios da sua biblioteca preenchem
            cada bloco marcado como "IA escolhe" — a estrutura em si (formato, duração, séries, número de exercícios,
            descanso) é definida por você.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sessões a gerar nesta sequência</Label>
              <Input
                type="number"
                min={1}
                max={52}
                className="h-9 tabular-nums"
                value={numeroSessoes}
                onChange={(e) => setNumeroSessoes(Math.max(1, Number(e.target.value)))}
              />
              <p className="text-[11px] text-muted-foreground">
                Mesmo molde repetido, exercícios variando entre elas quando o pool permitir.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Instruções adicionais — opcional</Label>
              <Textarea
                rows={2}
                className="resize-y text-sm"
                placeholder="Ex.: priorizar padrões de empurrar nesta semana."
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Blocos da sessão ({blocos.length})
              </Label>
            </div>

            {blocos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                <p className="text-sm text-muted-foreground">Nenhum bloco adicionado ainda.</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Comece adicionando o primeiro bloco da sessão (ex.: Mobilidade / Preparação).
                </p>
              </div>
            ) : (
              <SortableList ids={blocos.map((b) => b.chave)} label="Bloco" onReorder={reordenar}>
                <div className="space-y-2">
                  {blocos.map((b) => (
                    <SortableRow key={b.chave} id={b.chave} handleLabel={`Reordenar ${getFormatLabel(b.formato)}`}>
                      <div className="flex-1 min-w-0 pr-3 py-1">
                        <BlocoCard
                          bloco={b}
                          aberto={abertoChave === b.chave}
                          onToggle={() => setAbertoChave((prev) => (prev === b.chave ? null : b.chave))}
                          onChange={(patch) => atualizarBloco(b.chave, patch)}
                          onRemove={() => removerBloco(b.chave)}
                          formatLabel={getFormatLabel}
                        />
                      </div>
                    </SortableRow>
                  ))}
                </div>
              </SortableList>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar bloco
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-1">
                <div className="grid gap-0.5">
                  {formatosDisponiveis.map((f: any) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => adicionarBloco(f)}
                      className="rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
                    >
                      {getFormatLabel(f)}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 px-5 py-4 sm:px-6">
          <Button
            variant="ghost"
            onClick={() => {
              limpar();
              onOpenChange(false);
            }}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGerar}
            disabled={blocos.length === 0 || isGenerating}
            className="w-full gap-2 sm:w-auto"
          >
            {isGenerating ? "Gerando..." : `Gerar ${numeroSessoes} sessão(ões)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConstrutorMoldeDialog;
