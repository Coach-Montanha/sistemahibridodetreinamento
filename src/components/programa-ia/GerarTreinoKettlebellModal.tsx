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

export type { KbSportPayload };

const ESCOLAS: { value: EscolaMetodologica; label: string; descricao: string }[] = [
  { value: "auto", label: "Deixar sistema escolher", descricao: "Seleção automática pelo perfil do atleta" },
  { value: "fedorenko", label: "Fedorenko / WKC", descricao: "Volume progressivo, técnica minimalista" },
  { value: "rudnev", label: "Rudnev", descricao: "Periodização científica e relaxamento" },
  { value: "vorotyntsev", label: "Vorotyntsev", descricao: "Didática técnica por estágios" },
  { value: "denisov", label: "Denisov", descricao: "Alto volume — nível avançado/elite" },
  { value: "vasilev", label: "Vasilev", descricao: "Ciclos com testes de controle" },
  { value: "gomonov", label: "Gomonov / Machotkin", descricao: "Onboarding pedagógico para iniciantes" },
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

const PESOS_KETTLEBELL = [8, 12, 16, 20, 24, 28, 32];

function CargaInput({
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

export function GerarTreinoKettlebellModal({
  open,
  onOpenChange,
  titulo,
  escopoLabel,
  dataInicio,
  diasPorSemana,
  onGenerate,
  isGenerating = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  escopoLabel: string;
  dataInicio: string;
  diasPorSemana: number;
  onGenerate: (payload: KbSportPayload) => void;
  isGenerating?: boolean;
}) {
  const [escola, setEscola] = useState<EscolaMetodologica>("auto");
  const [nivel, setNivel] = useState<NivelAtleta>("intermediario");
  const [disciplina, setDisciplina] = useState<Disciplina>("long_cycle");
  const [pesoCorporal, setPesoCorporal] = useState<number | null>(null);
  const vazia: CargaLevantamento = { pesoKettlebellKg: null, repsAtuais10min: null };
  const [snatch, setSnatch] = useState<CargaLevantamento>(vazia);
  const [jerk, setJerk] = useState<CargaLevantamento>(vazia);
  const [longCycle, setLongCycle] = useState<CargaLevantamento>(vazia);

  const mostrarAvisoVolume =
    escola === "denisov" && (nivel === "iniciante" || nivel === "intermediario");

  function handleSubmit() {
    const cargas: KbSportPayload["cargas"] = {};
    if (disciplina === "biathlon" || disciplina === "ambas") {
      cargas.snatch = snatch;
      cargas.jerk = jerk;
    }
    if (disciplina === "long_cycle" || disciplina === "ambas") {
      cargas.longCycle = longCycle;
    }
    onGenerate({
      escolaMetodologica: escola,
      nivelAtleta: nivel,
      disciplina,
      pesoCorporalKg: pesoCorporal,
      cargas,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-5 w-5 text-primary" />
            Configurar geração — Kettlebell Sport
          </DialogTitle>
          <DialogDescription className="text-xs">
            {titulo} · {escopoLabel} · {diasPorSemana} sessão(ões)/semana · início em{" "}
            {dataInicio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label>Escola metodológica</Label>
            <Select value={escola} onValueChange={(v) => setEscola(v as EscolaMetodologica)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESCOLAS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ESCOLAS.find((e) => e.value === escola)?.descricao}
            </p>
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
            <div className="space-y-1.5">
              <Label>Disciplina</Label>
              <Select value={disciplina} onValueChange={(v) => setDisciplina(v as Disciplina)}>
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
          </div>

          {mostrarAvisoVolume && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                A linha Denisov envolve volume muito alto e é recomendada para atletas
                avançados/elite. Confirme que deseja aplicá-la a este perfil.
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
              onChange={(e) => setPesoCorporal(e.target.value ? Number(e.target.value) : null)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm">Cargas iniciais</Label>
            {(disciplina === "biathlon" || disciplina === "ambas") && (
              <>
                <CargaInput label="Snatch" carga={snatch} onChange={setSnatch} />
                <CargaInput label="Jerk" carga={jerk} onChange={setJerk} />
              </>
            )}
            {(disciplina === "long_cycle" || disciplina === "ambas") && (
              <CargaInput label="Long Cycle" carga={longCycle} onChange={setLongCycle} />
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

export default GerarTreinoKettlebellModal;