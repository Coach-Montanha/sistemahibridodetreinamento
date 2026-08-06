import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, AlertTriangle } from "lucide-react";
import type {
  CargaLevantamento,
  Disciplina,
  EscolaMetodologica,
  KbSportPayload,
  NivelAtleta,
} from "@/lib/kb-sport-ia.server";
import type {
  CapacidadeRecuperacao,
  EscolaWeightlifting,
  PontoFraco,
  WlPayload,
} from "@/lib/weightlifting-ia.server";
import type {
  EquipamentoFuncional,
  EscolaFuncional,
  FaseLesao,
  LesaoLimitacao,
  ObjetivoFuncional,
  RegiaoLesao,
  TfPayload,
} from "@/lib/funcional-ia.server";

export type ModalidadeIa =
  | "kettlebell_sport"
  | "levantamento_peso"
  | "treinamento_funcional";
export type { KbSportPayload, WlPayload, TfPayload };

const ESCOLAS_TF: { value: EscolaFuncional; label: string; descricao: string }[] = [
  { value: "auto", label: "Deixar sistema escolher", descricao: "Seleção automática pelo perfil e limitações" },
  { value: "fms_sfma", label: "FMS/SFMA (Gray Cook)", descricao: "Triagem e corretivos antes de carga" },
  { value: "boyle", label: "Joint-by-Joint (Boyle)", descricao: "Unilaterais e performance esportiva" },
  { value: "exos", label: "EXOS / Core Performance", descricao: "Sistema integrado com blocos fixos" },
  { value: "dns", label: "DNS (Escola de Praga)", descricao: "Estabilização central e respiração" },
  { value: "crossfit", label: "CrossFit", descricao: "Condicionamento geral variado e intenso" },
  { value: "original_strength", label: "Original Strength", descricao: "Reset neuromotor e base de movimento" },
];

const OBJETIVOS_TF: { value: ObjetivoFuncional; label: string }[] = [
  { value: "condicionamento_geral", label: "Condicionamento geral" },
  { value: "performance_esportiva", label: "Performance esportiva" },
  { value: "reabilitacao_retorno", label: "Reabilitação / retorno" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "hipertrofia_funcional", label: "Hipertrofia funcional" },
];

const EQUIPAMENTOS_TF: { value: EquipamentoFuncional; label: string }[] = [
  { value: "peso_corporal", label: "Apenas peso corporal" },
  { value: "academia_completa", label: "Academia completa" },
  { value: "kettlebell_halteres", label: "Kettlebells e halteres" },
  { value: "outdoor", label: "Outdoor" },
];

const REGIOES_TF: { value: RegiaoLesao; label: string }[] = [
  { value: "lombar", label: "Lombar" },
  { value: "joelho", label: "Joelho" },
  { value: "ombro", label: "Ombro" },
  { value: "quadril", label: "Quadril" },
  { value: "tornozelo", label: "Tornozelo" },
  { value: "core", label: "Core" },
  { value: "outro", label: "Outro" },
];

const FASES_TF: { value: FaseLesao; label: string }[] = [
  { value: "aguda", label: "Aguda (dor ativa)" },
  { value: "em_recuperacao", label: "Em recuperação" },
  { value: "cronica_controlada", label: "Crônica controlada" },
];

const ESCOLAS_KB: { value: EscolaMetodologica; label: string; descricao: string }[] = [
  { value: "auto", label: "Deixar sistema escolher", descricao: "Seleção automática pelo perfil do atleta" },
  { value: "fedorenko", label: "Fedorenko / WKC", descricao: "Volume progressivo, técnica minimalista" },
  { value: "rudnev", label: "Rudnev", descricao: "Periodização científica e relaxamento" },
  { value: "vorotyntsev", label: "Vorotyntsev", descricao: "Didática técnica por estágios" },
  { value: "denisov", label: "Denisov", descricao: "Alto volume — nível avançado/elite" },
  { value: "vasilev", label: "Vasilev", descricao: "Ciclos com testes de controle" },
  { value: "gomonov", label: "Gomonov / Machotkin", descricao: "Onboarding pedagógico para iniciantes" },
];

const ESCOLAS_WL: { value: EscolaWeightlifting; label: string; descricao: string }[] = [
  { value: "auto", label: "Deixar sistema escolher", descricao: "Seleção automática pelo perfil do atleta" },
  { value: "bulgara", label: "Búlgara", descricao: "Máximo diário — apenas elite com suporte total" },
  { value: "russa_classica", label: "Russa Clássica", descricao: "Periodização plurianual (Medvedev)" },
  { value: "chinesa", label: "Chinesa", descricao: "Correção de ponto fraco em alta frequência" },
  { value: "cubana", label: "Cubana", descricao: "Onboarding pedagógico para iniciantes" },
  { value: "colombiana", label: "Colombiana", descricao: "Transição de linha por classificação" },
  { value: "pendlay", label: "Pendlay / MDUSA", descricao: "Ensino técnico + frequência adaptada" },
  { value: "takano", label: "Takano", descricao: "Framework científico de planejamento" },
];

const NIVEIS: { value: NivelAtleta; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
  { value: "elite", label: "Elite" },
];

const DISCIPLINAS: { value: Disciplina; label: string }[] = [
  { value: "biathlon", label: "Biathlon (Snatch + Jerk)" },
  { value: "long_cycle", label: "Long Cycle" },
  { value: "ambas", label: "Ambas" },
];

const PONTOS_FRACOS: { value: PontoFraco; label: string }[] = [
  { value: "pernas", label: "Pernas" },
  { value: "costas", label: "Costas" },
  { value: "recepcao", label: "Técnica de recepção" },
  { value: "mobilidade_ombro", label: "Mobilidade de ombro" },
];

const RECUPERACAO: { value: CapacidadeRecuperacao; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const PESOS_KETTLEBELL = [8, 12, 16, 20, 24, 28, 32];

function CargaKbInput({
  label,
  carga,
  onChange,
}: {
  label: string;
  carga: CargaLevantamento;
  onChange: (c: CargaLevantamento) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="col-span-2 text-sm font-medium text-foreground">{label}</div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Kettlebell (kg)</Label>
        <Select
          value={carga.pesoKettlebellKg?.toString() ?? ""}
          onValueChange={(v) => onChange({ ...carga, pesoKettlebellKg: Number(v) })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecionar" />
          </SelectTrigger>
          <SelectContent>
            {PESOS_KETTLEBELL.map((p) => (
              <SelectItem key={p} value={p.toString()}>
                {p} kg
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Reps atuais (10 min)</Label>
        <Input
          type="number"
          min={0}
          placeholder="Ex: 45"
          className="h-9"
          value={carga.repsAtuais10min ?? ""}
          onChange={(e) =>
            onChange({
              ...carga,
              repsAtuais10min: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </div>
    </div>
  );
}

function CargaWlInput({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <Input
        type="number"
        min={0}
        placeholder="kg (melhor marca)"
        className="h-9 w-40"
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      />
    </div>
  );
}

export function GerarTreinoModal({
  open,
  onOpenChange,
  modalidade,
  titulo,
  escopoLabel,
  dataInicio,
  diasPorSemana,
  onGenerateKb,
  onGenerateWl,
  onGenerateTf,
  isGenerating = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalidade: ModalidadeIa;
  titulo: string;
  escopoLabel: string;
  dataInicio: string;
  diasPorSemana: number;
  onGenerateKb: (payload: KbSportPayload) => void;
  onGenerateWl: (payload: WlPayload) => void;
  onGenerateTf?: (payload: TfPayload) => void;
  isGenerating?: boolean;
}) {
  const isKb = modalidade === "kettlebell_sport";
  const isTf = modalidade === "treinamento_funcional";

  const [escolaKb, setEscolaKb] = useState<EscolaMetodologica>("auto");
  const [escolaWl, setEscolaWl] = useState<EscolaWeightlifting>("auto");
  const [nivel, setNivel] = useState<NivelAtleta>("intermediario");
  const [disciplina, setDisciplina] = useState<Disciplina>("long_cycle");
  const [pesoCorporal, setPesoCorporal] = useState<number | null>(null);

  const vazia: CargaLevantamento = { pesoKettlebellKg: null, repsAtuais10min: null };
  const [snatch, setSnatch] = useState<CargaLevantamento>(vazia);
  const [jerk, setJerk] = useState<CargaLevantamento>(vazia);
  const [longCycle, setLongCycle] = useState<CargaLevantamento>(vazia);

  const [classificacao, setClassificacao] = useState("");
  const [pontoFraco, setPontoFraco] = useState<PontoFraco | "nenhum">("nenhum");
  const [recuperacao, setRecuperacao] = useState<CapacidadeRecuperacao>("media");
  const [suporteTotal, setSuporteTotal] = useState(false);
  const [arranco, setArranco] = useState<number | null>(null);
  const [arremesso, setArremesso] = useState<number | null>(null);
  const [agachaCostas, setAgachaCostas] = useState<number | null>(null);
  const [agachaFrontal, setAgachaFrontal] = useState<number | null>(null);

  const [escolaTf, setEscolaTf] = useState<EscolaFuncional>("auto");
  const [objetivoTf, setObjetivoTf] = useState<ObjetivoFuncional>("condicionamento_geral");
  const [equipamentoTf, setEquipamentoTf] =
    useState<EquipamentoFuncional>("academia_completa");
  const [sedentarismo, setSedentarismo] = useState(false);
  const [lesoes, setLesoes] = useState<LesaoLimitacao[]>([]);

  const escolas = isTf ? ESCOLAS_TF : isKb ? ESCOLAS_KB : ESCOLAS_WL;
  const escolaAtual: string = isTf ? escolaTf : isKb ? escolaKb : escolaWl;
  const descricaoEscola = escolas.find((e) => e.value === escolaAtual)?.descricao;

  const avisoKb =
    isKb && escolaKb === "denisov" && (nivel === "iniciante" || nivel === "intermediario");
  const avisoWl =
    !isKb &&
    escolaWl === "bulgara" &&
    !(
      (nivel === "elite" || nivel === "avancado") &&
      recuperacao === "alta" &&
      suporteTotal
    );

  function handleSubmit() {
    if (isTf) {
      onGenerateTf?.({
        escolaMetodologica: escolaTf,
        nivelAtleta: nivel,
        objetivo: objetivoTf,
        equipamento: equipamentoTf,
        sedentarismoProlongado: sedentarismo,
        lesoes,
      });
      return;
    }
    if (isKb) {
      const cargas: KbSportPayload["cargas"] = {};
      if (disciplina === "biathlon" || disciplina === "ambas") {
        cargas.snatch = snatch;
        cargas.jerk = jerk;
      }
      if (disciplina === "long_cycle" || disciplina === "ambas") {
        cargas.longCycle = longCycle;
      }
      onGenerateKb({
        escolaMetodologica: escolaKb,
        nivelAtleta: nivel,
        disciplina,
        pesoCorporalKg: pesoCorporal,
        cargas,
      });
      return;
    }
    onGenerateWl({
      escolaMetodologica: escolaWl,
      nivelAtleta: nivel,
      pesoCorporalKg: pesoCorporal,
      classificacaoOficial: classificacao.trim() || null,
      pontoFracoIdentificado: pontoFraco === "nenhum" ? null : pontoFraco,
      capacidadeRecuperacao: recuperacao,
      suporteTotalDeclarado: suporteTotal,
      cargas: {
        arranco: { cargaKg: arranco },
        arremesso: { cargaKg: arremesso },
        agachamentoCostas: { cargaKg: agachaCostas },
        agachamentoFrontal: { cargaKg: agachaFrontal },
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-5 w-5 text-primary" />
            Configurar geração —{" "}
            {isKb ? "Kettlebell Sport" : "Levantamento de Peso"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {titulo} · {escopoLabel} · {diasPorSemana} sessão(ões)/semana · início em{" "}
            {dataInicio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label>Escola metodológica</Label>
            <Select
              value={escolaAtual}
              onValueChange={(v) =>
                isKb
                  ? setEscolaKb(v as EscolaMetodologica)
                  : setEscolaWl(v as EscolaWeightlifting)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {escolas.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{descricaoEscola}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nível do atleta</Label>
              <Select value={nivel} onValueChange={(v) => setNivel(v as NivelAtleta)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NIVEIS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isKb ? (
              <div className="space-y-1.5">
                <Label>Disciplina</Label>
                <Select
                  value={disciplina}
                  onValueChange={(v) => setDisciplina(v as Disciplina)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINAS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Capacidade de recuperação</Label>
                <Select
                  value={recuperacao}
                  onValueChange={(v) => setRecuperacao(v as CapacidadeRecuperacao)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECUPERACAO.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!isKb && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Classificação oficial — opcional</Label>
                <Input
                  placeholder="Ex: Mestre do Esporte"
                  value={classificacao}
                  onChange={(e) => setClassificacao(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ponto fraco identificado</Label>
                <Select
                  value={pontoFraco}
                  onValueChange={(v) => setPontoFraco(v as PontoFraco | "nenhum")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {PONTOS_FRACOS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!isKb && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div className="pr-3">
                <p className="text-sm font-medium">Suporte total declarado</p>
                <p className="text-xs text-muted-foreground">
                  Dedicação integral, fisioterapia e recuperação assistida.
                </p>
              </div>
              <Switch checked={suporteTotal} onCheckedChange={setSuporteTotal} />
            </div>
          )}

          {(avisoKb || avisoWl) && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {avisoKb
                  ? "A linha Denisov envolve volume muito alto e é recomendada para atletas avançados/elite. Confirme que deseja aplicá-la a este perfil."
                  : "A linha Búlgara exige nível elite/avançado, recuperação alta e suporte total. Sem as três condições, a prescrição será gerada em versão mais conservadora."}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Peso corporal (kg) — opcional</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 78"
              value={pesoCorporal ?? ""}
              onChange={(e) =>
                setPesoCorporal(e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm">Cargas iniciais</Label>
            {isKb ? (
              <>
                {(disciplina === "biathlon" || disciplina === "ambas") && (
                  <>
                    <CargaKbInput label="Snatch" carga={snatch} onChange={setSnatch} />
                    <CargaKbInput label="Jerk" carga={jerk} onChange={setJerk} />
                  </>
                )}
                {(disciplina === "long_cycle" || disciplina === "ambas") && (
                  <CargaKbInput
                    label="Long Cycle"
                    carga={longCycle}
                    onChange={setLongCycle}
                  />
                )}
              </>
            ) : (
              <>
                <CargaWlInput label="Arranco" valor={arranco} onChange={setArranco} />
                <CargaWlInput
                  label="Arremesso"
                  valor={arremesso}
                  onChange={setArremesso}
                />
                <CargaWlInput
                  label="Agachamento costas"
                  valor={agachaCostas}
                  onChange={setAgachaCostas}
                />
                <CargaWlInput
                  label="Agachamento frontal"
                  valor={agachaFrontal}
                  onChange={setAgachaFrontal}
                />
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isGenerating}>
            {isGenerating ? "Gerando..." : "Gerar treino"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GerarTreinoModal;
