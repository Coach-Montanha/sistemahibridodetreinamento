import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, Settings2, AlertTriangle, ListChecks, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getGeneratorPrefs } from "@/lib/generator-prefs.functions";
import { gerarTreino } from "@/lib/gerador.functions";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { supabase } from "@/integrations/supabase/client";
import { useCoach } from "@/hooks/use-coach";

const PrescreverIaDialog = lazy(() =>
  import("@/components/programa-ia/PrescreverIaDialog").then((m) => ({
    default: m.PrescreverIaDialog,
  })),
);

const GerarTreinoModal = lazy(() =>
  import("@/components/programa-ia/GerarTreinoModal").then((m) => ({
    default: m.GerarTreinoModal,
  })),
);

const ConstrutorMoldeDialog = lazy(() =>
  import("@/components/programa-ia/ConstrutorMoldeDialog").then((m) => ({
    default: m.ConstrutorMoldeDialog,
  })),
);

import type { KbSportPayload } from "@/lib/kb-sport-ia.server";
import type { WlPayload } from "@/lib/weightlifting-ia.server";
import type { TfPayload } from "@/lib/funcional-ia.server";
import type { CorridaPayload } from "@/lib/corrida-ia.server";
import type { HibridoPayload, ModalidadeHibrida } from "@/lib/hibrido-ia.server";

const SEMANAS_POR_ESCOPO: Record<string, number> = {
  sessao: 1,
  semana: 1,
  mes: 4,
  ano: 52,
};

const ESCOPO_LABEL: Record<string, string> = {
  sessao: "1 sessão",
  semana: "1 semana",
  mes: "1 mês (4 semanas)",
  ano: "1 ano (52 semanas)",
};

export const Route = createFileRoute("/_authenticated/app/gerar")({
  component: GerarPage,
});

function GerarPage() {
  return <GerarPanel />;
}

export function GerarPanel({ showHeader = true }: { showHeader?: boolean } = {}) {
  const navigate = useNavigate();
  const gerar = useServerFn(gerarTreino);
  const { data: coach } = useCoach();
  const [loading, setLoading] = useState(false);
  const [metodologia, setMetodologia] = useState<Methodology>("hibrido");
  const [escopo, setEscopo] = useState<"sessao" | "semana" | "mes" | "ano">("sessao");
  const [titulo, setTitulo] = useState("Programa gerado");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dias, setDias] = useState(3);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [iaPrograma, setIaPrograma] = useState<{ id: string; titulo: string } | null>(
    null,
  );
  const [iaEscopo, setIaEscopo] = useState<{
    label: string;
    semanas: number;
    diasPorSemana: number;
    dataInicio: string;
  } | null>(null);
  const [kbConfig, setKbConfig] = useState<KbSportPayload | null>(null);
  const [wlConfig, setWlConfig] = useState<WlPayload | null>(null);
  const [tfConfig, setTfConfig] = useState<TfPayload | null>(null);
  const [coConfig, setCoConfig] = useState<CorridaPayload | null>(null);
  const [hibridoConfig, setHibridoConfig] = useState<HibridoPayload | null>(null);
  const [hibridoInstrucoes, setHibridoInstrucoes] = useState("");
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [moldeModalOpen, setMoldeModalOpen] = useState(false);
  const isMusculacao = metodologia === "musculacao";
  const isKbSport = metodologia === "kettlebell_sport";
  const isWeightlifting = metodologia === "levantamento_peso";
  const isFuncional = metodologia === "treinamento_funcional";
  const isCorrida = metodologia === "corrida";
  const isHibrido = metodologia === "hibrido";
  // Kettlebell Fitness já tem um gerador dedicado (sorteio por categoria via
  // gerarTreino/gerador.functions). NÃO ativamos o molde para ele ainda —
  // troque para `metodologia === "kettlebell_fitness"` quando decidir migrar.
  const isKbFitnessMolde = false;
  const usaModalIa = isKbSport || isWeightlifting || isFuncional || isCorrida;
  const usaMolde = isHibrido || isKbFitnessMolde;

  const prefs = useQuery({
    queryKey: ["generator-prefs", metodologia],
    queryFn: () => getGeneratorPrefs({ data: { metodologia } }),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (usaMolde) {
      setMoldeModalOpen(true);
      return;
    }
    if (usaModalIa) {
      setKbModalOpen(true);
      return;
    }
    setLoading(true);
    setAvisos([]);
    try {
      if (isMusculacao) {
        if (!coach) throw new Error("Perfil de treinador não encontrado");
        const { data: prog, error } = await supabase
          .from("programs")
          .insert({
            coach_id: coach.id,
            metodologia: "musculacao",
            titulo,
            data_inicio: dataInicio,
            duracao_semanas: SEMANAS_POR_ESCOPO[escopo] ?? 4,
          })
          .select("id, titulo")
          .single();
        if (error || !prog) throw new Error(error?.message ?? "Falha ao criar rotina");
        setIaEscopo({
          label: ESCOPO_LABEL[escopo] ?? escopo,
          semanas: SEMANAS_POR_ESCOPO[escopo] ?? 4,
          diasPorSemana: escopo === "sessao" ? 1 : dias,
          dataInicio,
        });
        setIaPrograma({ id: prog.id, titulo: prog.titulo ?? titulo });
        return;
      }
      const res = await gerar({
        data: {
          metodologia,
          escopo,
          titulo,
          data_inicio: dataInicio,
          dias_por_semana: dias,
        },
      });
      toast.success(
        `Gerado: ${res.resultado.reduce((s, r) => s + r.sessoes, 0)} sessão(ões)`,
      );
      const list = (res as any).avisos as string[] | undefined;
      if (list && list.length > 0) {
        setAvisos(list);
      }
      if (res.primeira_sessao_id) {
        navigate({ to: "/app/sessoes/$id", params: { id: res.primeira_sessao_id } });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao gerar");
    } finally {
      setLoading(false);
    }
  }

  /** Cria a rotina e abre a prescrição por IA com a escola metodológica escolhida. */
  async function gerarComEscola(cfg: {
    kb?: KbSportPayload;
    wl?: WlPayload;
    tf?: TfPayload;
    co?: CorridaPayload;
    hibrido?: HibridoPayload;
    instrucoes?: string;
  }) {
    setLoading(true);
    try {
      if (!coach) throw new Error("Perfil de treinador não encontrado");
      const semanas = SEMANAS_POR_ESCOPO[escopo] ?? 4;
      const { data: prog, error } = await supabase
        .from("programs")
        .insert({
          coach_id: coach.id,
          metodologia,
          titulo,
          data_inicio: dataInicio,
          duracao_semanas: semanas,
        })
        .select("id, titulo")
        .single();
      if (error || !prog) throw new Error(error?.message ?? "Falha ao criar rotina");

      // O Híbrido e o Kettlebell Fitness têm seu próprio fluxo direto que não passa pelo PrescreverIaDialog
      // para evitar conflito de tipos no step de prévia (o hibrido-gerar salva direto).
      if (usaMolde && cfg.hibrido) {
        const { gerarSessoesHibrido } = await import("@/lib/hibrido-gerar.functions");
        const res = await gerarSessoesHibrido({
          data: {
            modalidade: metodologia as ModalidadeHibrida,
            tituloPrograma: titulo,
            numeroSessoes: cfg.hibrido.numeroSessoes,
            diasPorSemana: escopo === "sessao" ? 1 : dias,
            dataInicio,
            sessaoTemplate: cfg.hibrido.sessaoTemplate,
            instrucoes: cfg.instrucoes ?? "",
          },
        });
        toast.success(`${res.sessoesGeradas} treino(s) gerado(s) com sucesso.`);
        setMoldeModalOpen(false);
        navigate({ to: "/app/treinos", search: { aba: "programas" } });
        return;
      }

      setKbConfig(cfg.kb ?? null);
      setWlConfig(cfg.wl ?? null);
      setTfConfig(cfg.tf ?? null);
      setCoConfig(cfg.co ?? null);
      setHibridoConfig(null);
      setHibridoInstrucoes(cfg.instrucoes ?? "");
      setKbModalOpen(false);
      setIaEscopo({
        label: ESCOPO_LABEL[escopo] ?? escopo,
        semanas,
        diasPorSemana: escopo === "sessao" ? 1 : dias,
        dataInicio,
      });
      setIaPrograma({ id: prog.id, titulo: prog.titulo ?? titulo });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao gerar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={showHeader ? "mx-auto max-w-2xl p-6" : "mx-auto max-w-2xl"}>
      {showHeader && (
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gerar treino</h1>
              <p className="text-sm text-muted-foreground">
                Motor automático baseado nos templates da modalidade.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/app/treinos", search: { aba: "programas" } })}
            className="text-muted-foreground hover:text-foreground"
          >
            Voltar
          </Button>
        </div>
      )}

      <Card className="p-6">
        {isMusculacao ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 text-xs">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="flex-1 leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Musculação usa IA.</strong> Esta
              modalidade não usa o banco de exercícios nem os templates de blocos: ao
              gerar, criamos a rotina e abrimos o <strong className="text-foreground">Prescrever
              com IA</strong>, onde você descreve a divisão desejada e revisa a prévia
              antes de salvar.
            </p>
          </div>
        ) : isHibrido || isKbFitness ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 text-xs">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="flex-1 leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Motor por molde estrutural.</strong>{" "}
              Ao gerar, você monta a estrutura fixa de blocos da sessão (formato, duração,
              séries, número de exercícios, descanso) e a IA só escolhe quais exercícios da
              sua biblioteca preenchem cada bloco marcado como "IA escolhe".
            </p>
          </div>
        ) : isCorrida ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 text-xs">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="flex-1 leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Motor por linha metodológica.</strong>{" "}
              Ao gerar, você informa distância-alvo, volume semanal, marca recente e
              lesões, e escolhe a linha (Daniels/VDOT, Lydiard, Canova, Hansons,
              Pfitzinger, Horwill, Koop) ou deixa o sistema decidir pela distância e base
              aeróbica.
            </p>
          </div>
        ) : isFuncional ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 text-xs">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="flex-1 leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Motor por linha metodológica.</strong>{" "}
              Ao gerar, você informa objetivo, equipamento e lesões/limitações, e escolhe
              a linha (FMS/SFMA, Joint-by-Joint, EXOS, DNS, CrossFit, Original Strength)
              ou deixa o sistema decidir — a segurança clínica tem prioridade.
            </p>
          </div>
        ) : isWeightlifting ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 text-xs">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="flex-1 leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Motor por escola metodológica.</strong>{" "}
              Ao gerar, você escolhe a linha (Búlgara, Russa Clássica, Chinesa, Cubana,
              Colombiana, Pendlay, Takano ou automática), nível, classificação, ponto
              fraco e cargas — a IA monta o ciclo seguindo essa filosofia.
            </p>
          </div>
        ) : isKbSport ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 text-xs">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="flex-1 leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Motor por escola metodológica.</strong>{" "}
              Ao gerar, você escolhe a linha (Fedorenko, Rudnev, Vorotyntsev, Denisov,
              Vasilev, Gomonov ou automática), nível, disciplina e cargas iniciais — a IA
              monta o ciclo seguindo estritamente essa filosofia.
            </p>
          </div>
        ) : (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
          <Settings2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 leading-relaxed text-muted-foreground">
            <span>
              {prefs.data?.origem === "custom"
                ? <>Usando suas preferências de <strong className="text-foreground">{METHODOLOGY_LABEL[metodologia]}</strong>.</>
                : <>Usando templates padrão de <strong className="text-foreground">{METHODOLOGY_LABEL[metodologia]}</strong>.</>}
            </span>
            {(() => {
              const curados = (prefs.data?.blocos ?? []).filter(
                (b: any) => Array.isArray(b.exercicios_permitidos) && b.exercicios_permitidos.length > 0,
              ).length;
              if (curados === 0) return null;
              return (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <ListChecks className="h-3 w-3" />
                  {curados} bloco{curados === 1 ? "" : "s"} com pool curado
                </span>
              );
            })()}
            <Link
              to="/app/configuracoes"
              search={{ section: "geracao" }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {prefs.data?.origem === "custom" ? "Ajustar" : "Personalizar"}
            </Link>
          </div>
        </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Título do programa</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Modalidade</Label>
              <Select value={metodologia} onValueChange={(v) => setMetodologia(v as Methodology)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(METHODOLOGY_LABEL) as Methodology[]).map((k) => (
                    <SelectItem key={k} value={k}>{METHODOLOGY_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Escopo</Label>
              <Select value={escopo} onValueChange={(v) => setEscopo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sessao">1 sessão</SelectItem>
                  <SelectItem value="semana">1 semana</SelectItem>
                  <SelectItem value="mes">1 mês (4 semanas)</SelectItem>
                  <SelectItem value="ano">1 ano (52 semanas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Data de início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
            </div>
            <div>
              <Label>Dias por semana</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                disabled={escopo === "sessao"}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? isMusculacao
                ? "Criando rotina..."
                : "Gerando..."
              : isMusculacao
                ? "Prescrever com IA"
                : usaModalIa
                  ? "Configurar e gerar"
                  : "Gerar treino"}
          </Button>
        </form>

        {avisos.length > 0 && (
          <div className="mt-4 space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
              <AlertTriangle className="h-4 w-4" />
              Avisos da geração
            </div>
            <ul className="space-y-1 text-xs leading-relaxed text-warning-foreground/90">
              {avisos.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-warning-foreground/60" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {moldeModalOpen && (
        <Suspense fallback={null}>
          <ConstrutorMoldeDialog
            open={moldeModalOpen}
            onOpenChange={setMoldeModalOpen}
            modalidade={metodologia as ModalidadeHibrida}
            tituloPrograma={titulo}
            isGenerating={loading}
            onGerar={(hibrido, instrucoes) => gerarComEscola({ hibrido, instrucoes })}
          />
        </Suspense>
      )}

      {kbModalOpen && !isHibrido && (
        <Suspense fallback={null}>
          <GerarTreinoModal
            open={kbModalOpen}
            onOpenChange={setKbModalOpen}
            modalidade={
              isKbSport
                ? "kettlebell_sport"
                : isCorrida
                  ? "corrida"
                  : isFuncional
                    ? "treinamento_funcional"
                    : "levantamento_peso"
            }
            titulo={titulo}
            escopoLabel={ESCOPO_LABEL[escopo] ?? escopo}
            dataInicio={dataInicio}
            diasPorSemana={escopo === "sessao" ? 1 : dias}
            isGenerating={loading}
            onGenerateKb={(kb) => gerarComEscola({ kb })}
            onGenerateWl={(wl) => gerarComEscola({ wl })}
            onGenerateTf={(tf) => gerarComEscola({ tf })}
            onGenerateCo={(co) => gerarComEscola({ co })}
          />
        </Suspense>
      )}

      {iaPrograma && (
        <Suspense fallback={null}>
          <PrescreverIaDialog
            programa={iaPrograma}
            escopo={iaEscopo}
            kb={kbConfig}
            wl={wlConfig}
            tf={tfConfig}
            co={coConfig}
            hibrido={hibridoConfig}
            promptInicial={hibridoInstrucoes}
            onOpenChange={(o: boolean) => {
              if (!o) {
                setIaPrograma(null);
                setIaEscopo(null);
                setKbConfig(null);
                setWlConfig(null);
                setTfConfig(null);
                setCoConfig(null);
                setHibridoConfig(null);
                setHibridoInstrucoes("");
                navigate({ to: "/app/programas" });
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
}