import React, { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Brain,
  Sparkles,
  Save,
  Plus,
  X,
  AlertTriangle,
  Dumbbell,
  Target,
  FileText,
  Eye,
  Check,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AthleteMemory,
  type AthleteLevel,
  COMMON_INJURIES_LIST,
  COMMON_EQUIPMENT_LIST,
  parseAthleteMemory,
  serializeAthleteMemory,
  formatMemoryForPrompt,
} from "@/lib/athlete-memory";
import { updateStudentMemory } from "@/lib/students.functions";

interface AthleteMemoryPanelProps {
  student: {
    id: string;
    nome: string;
    email: string;
    observacoes?: string | null;
  };
}

export function AthleteMemoryPanel({ student }: AthleteMemoryPanelProps) {
  const qc = useQueryClient();
  const updateMemoryFn = useServerFn(updateStudentMemory);

  const initialMemory = useMemo(
    () => parseAthleteMemory(student.observacoes),
    [student.observacoes],
  );

  const [memory, setMemory] = useState<AthleteMemory>(initialMemory);
  const [novaLesao, setNovaLesao] = useState("");
  const [novoEquipamento, setNovoEquipamento] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza se o aluno mudar
  useEffect(() => {
    setMemory(parseAthleteMemory(student.observacoes));
  }, [student.id, student.observacoes]);

  // Handlers para Lesões
  const togglePresetLesao = (lesaoText: string) => {
    setMemory((prev) => {
      const exists = prev.lesoes.includes(lesaoText);
      const updated = exists
        ? prev.lesoes.filter((l) => l !== lesaoText)
        : [...prev.lesoes, lesaoText];
      return { ...prev, lesoes: updated };
    });
  };

  const addCustomLesao = () => {
    const trimmed = novaLesao.trim();
    if (!trimmed) return;
    if (!memory.lesoes.includes(trimmed)) {
      setMemory((prev) => ({ ...prev, lesoes: [...prev.lesoes, trimmed] }));
    }
    setNovaLesao("");
  };

  const removeLesao = (idx: number) => {
    setMemory((prev) => ({
      ...prev,
      lesoes: prev.lesoes.filter((_, i) => i !== idx),
    }));
  };

  // Handlers para Equipamentos
  const togglePresetEquipamento = (equipText: string) => {
    setMemory((prev) => {
      const exists = prev.equipamentos.includes(equipText);
      const updated = exists
        ? prev.equipamentos.filter((e) => e !== equipText)
        : [...prev.equipamentos, equipText];
      return { ...prev, equipamentos: updated };
    });
  };

  const addCustomEquipamento = () => {
    const trimmed = novoEquipamento.trim();
    if (!trimmed) return;
    if (!memory.equipamentos.includes(trimmed)) {
      setMemory((prev) => ({
        ...prev,
        equipamentos: [...prev.equipamentos, trimmed],
      }));
    }
    setNovoEquipamento("");
  };

  const removeEquipamento = (idx: number) => {
    setMemory((prev) => ({
      ...prev,
      equipamentos: prev.equipamentos.filter((_, i) => i !== idx),
    }));
  };

  // Handlers para 1RM
  const handleCargaChange = (
    campo: keyof typeof memory.cargas1rm,
    valor: string,
  ) => {
    if (campo === "outrasCargas") {
      setMemory((prev) => ({
        ...prev,
        cargas1rm: { ...prev.cargas1rm, outrasCargas: valor || null },
      }));
      return;
    }

    const num = valor === "" ? null : Number(valor);
    setMemory((prev) => ({
      ...prev,
      cargas1rm: {
        ...prev.cargas1rm,
        [campo]: isNaN(num as number) ? null : num,
      },
    }));
  };

  // Salvar no backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const serialized = serializeAthleteMemory(memory);
      await updateMemoryFn({
        data: {
          student_id: student.id,
          memory: serialized,
        },
      });
      toast.success("Memória do atleta atualizada com sucesso!");
      qc.invalidateQueries({ queryKey: ["students"] });
    } catch (err: any) {
      toast.error(`Erro ao salvar memória: ${err.message || "Tente novamente"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Prompt semântico formatado para prévia
  const formattedPromptPreview = useMemo(
    () => formatMemoryForPrompt(student.nome, memory),
    [student.nome, memory],
  );

  // Contagem de 1RMs preenchidos
  const countCargas = useMemo(() => {
    const c = memory.cargas1rm || {};
    return Object.entries(c).filter(([k, v]) => k !== "outrasCargas" && v !== null && v !== undefined && v > 0).length;
  }, [memory.cargas1rm]);

  return (
    <div className="space-y-6 pt-1">
      {/* Banner Principal do Context Engine */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-base">
                  Memória Persistente do Atleta
                </h3>
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-mono">
                  IA Context Engine
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xl">
                Toda vez que a IA prescrever treinos para <strong>{student.nome}</strong>, ela consultará automaticamente estas restrições, 1RMs, equipamentos e diretrizes técnicas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 cursor-pointer"
              onClick={() => setShowPromptPreview(!showPromptPreview)}
            >
              <Eye className="h-3.5 w-3.5" />
              {showPromptPreview ? "Ocultar IA" : "Ver IA"}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Salvando..." : "Salvar Memória"}
            </Button>
          </div>
        </div>

        {/* Badges de Status Rápido */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/50 text-xs">
          <Badge variant="secondary" className="gap-1 bg-muted/60">
            <Target className="h-3 w-3 text-primary" />
            Nível: <span className="font-medium capitalize">{memory.nivelAtleta}</span>
          </Badge>
          <Badge
            variant="secondary"
            className={`gap-1 ${memory.lesoes.length > 0 ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-muted/60"}`}
          >
            <AlertTriangle className="h-3 w-3" />
            {memory.lesoes.length} restrição(ões)
          </Badge>
          <Badge variant="secondary" className="gap-1 bg-muted/60">
            <Dumbbell className="h-3 w-3 text-primary" />
            {memory.equipamentos.length} equipamento(s)
          </Badge>
          <Badge variant="secondary" className="gap-1 bg-muted/60">
            <Sparkles className="h-3 w-3 text-primary" />
            {countCargas} 1RM(s) cadastrado(s)
          </Badge>
        </div>
      </div>

      {/* Prévia da Visão da IA (Collapsible) */}
      {showPromptPreview && (
        <Card className="p-4 bg-muted/30 border-dashed border-primary/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Visão Semântica Injetada na IA
            </div>
            <span className="text-[10px] text-muted-foreground">Injeção automática nos geradores</span>
          </div>
          <pre className="text-[11px] font-mono leading-relaxed bg-background/80 p-3 rounded-lg border border-border/60 overflow-x-auto text-muted-foreground whitespace-pre-wrap">
            {formattedPromptPreview}
          </pre>
        </Card>
      )}

      {/* Seção 1: Nível & Experiência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nível de Treinamento</Label>
          <Select
            value={memory.nivelAtleta}
            onValueChange={(val: AthleteLevel) =>
              setMemory((prev) => ({ ...prev, nivelAtleta: val }))
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="iniciante">Iniciante (menos de 6 meses)</SelectItem>
              <SelectItem value="intermediario">Intermediário (6 a 24 meses)</SelectItem>
              <SelectItem value="avancado">Avançado (2 a 5 anos)</SelectItem>
              <SelectItem value="elite">Elite / Competidor (+5 anos)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Tempo de Prática Contínua (meses)</Label>
          <Input
            type="number"
            min={0}
            className="h-9"
            placeholder="Ex: 18"
            value={memory.tempoTreinoMeses ?? ""}
            onChange={(e) =>
              setMemory((prev) => ({
                ...prev,
                tempoTreinoMeses: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </div>
      </div>

      {/* Seção 2: Lesões & Restrições Anatômicas */}
      <div className="space-y-3 rounded-xl border border-border/70 p-4 bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <Label className="text-sm font-semibold text-foreground">
              Lesões, Dores & Restrições Articulares
            </Label>
          </div>
          <span className="text-[11px] text-amber-500/90 font-medium">
            A IA nunca prescreverá exercícios de risco
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Clique nas regiões abaixo para ativar rapidamente ou adicione um detalhe específico.
        </p>

        {/* Chips de Seleção Rápida de Lesões */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_INJURIES_LIST.map((injury) => {
            const isSelected = memory.lesoes.includes(injury);
            return (
              <button
                key={injury}
                type="button"
                onClick={() => togglePresetLesao(injury)}
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 border-amber-500/60 text-amber-400 font-medium"
                    : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-60" />}
                {injury}
              </button>
            );
          })}
        </div>

        {/* Lista de Restrições Ativas */}
        {memory.lesoes.length > 0 && (
          <div className="space-y-1 pt-2">
            <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Restrições ativas para este aluno ({memory.lesoes.length}):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {memory.lesoes.map((lesao, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-400 pr-1 py-1"
                >
                  <span>{lesao}</span>
                  <button
                    type="button"
                    onClick={() => removeLesao(idx)}
                    className="p-0.5 rounded-full hover:bg-amber-500/30 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar Restrição Customizada */}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Ex: Hérnia discal L5-S1, evitar flexão sob carga pesada"
            value={novaLesao}
            onChange={(e) => setNovaLesao(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomLesao())}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addCustomLesao}
            className="h-8 text-xs shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Seção 3: Equipamentos Disponíveis */}
      <div className="space-y-3 rounded-xl border border-border/70 p-4 bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">
              Equipamentos Acessíveis ao Atleta
            </Label>
          </div>
          <span className="text-[11px] text-muted-foreground">
            A IA usará apenas o que o atleta possui
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Marque tudo o que o atleta tem no box, academia ou home gym.
        </p>

        {/* Chips de Seleção Rápida de Equipamentos */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_EQUIPMENT_LIST.map((equip) => {
            const isSelected = memory.equipamentos.includes(equip);
            return (
              <button
                key={equip}
                type="button"
                onClick={() => togglePresetEquipamento(equip)}
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition cursor-pointer ${
                  isSelected
                    ? "bg-primary/20 border-primary/60 text-primary font-medium"
                    : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-60" />}
                {equip}
              </button>
            );
          })}
        </div>

        {/* Lista de Equipamentos Ativos */}
        {memory.equipamentos.length > 0 && (
          <div className="space-y-1 pt-2">
            <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Equipamentos selecionados ({memory.equipamentos.length}):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {memory.equipamentos.map((equip, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="gap-1.5 border-primary/40 bg-primary/10 text-primary pr-1 py-1"
                >
                  <span>{equip}</span>
                  <button
                    type="button"
                    onClick={() => removeEquipamento(idx)}
                    className="p-0.5 rounded-full hover:bg-primary/30 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar Equipamento Customizado */}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Ex: Kettlebell de 20kg e 24kg em casa"
            value={novoEquipamento}
            onChange={(e) => setNovoEquipamento(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomEquipamento())}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addCustomEquipamento}
            className="h-8 text-xs shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Seção 4: Cargas de Referência & 1RMs */}
      <div className="space-y-3 rounded-xl border border-border/70 p-4 bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">
              Cargas de Referência & 1RM
            </Label>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Base para cálculo de porcentagens na prescrição
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Agachamento Costas (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 140"
              className="h-8 text-xs"
              value={memory.cargas1rm.agachamentoCostasKg ?? ""}
              onChange={(e) => handleCargaChange("agachamentoCostasKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Agachamento Frontal (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 115"
              className="h-8 text-xs"
              value={memory.cargas1rm.agachamentoFrontalKg ?? ""}
              onChange={(e) => handleCargaChange("agachamentoFrontalKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Supino Reto (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 100"
              className="h-8 text-xs"
              value={memory.cargas1rm.supinoKg ?? ""}
              onChange={(e) => handleCargaChange("supinoKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Levantamento Terra (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 170"
              className="h-8 text-xs"
              value={memory.cargas1rm.levantamentoTerraKg ?? ""}
              onChange={(e) => handleCargaChange("levantamentoTerraKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Desenvolvimento Militar (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 70"
              className="h-8 text-xs"
              value={memory.cargas1rm.desenvolvimentoMilitarKg ?? ""}
              onChange={(e) => handleCargaChange("desenvolvimentoMilitarKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Snatch / Arranco (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 85"
              className="h-8 text-xs"
              value={memory.cargas1rm.snatchKg ?? ""}
              onChange={(e) => handleCargaChange("snatchKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Clean & Jerk (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 105"
              className="h-8 text-xs"
              value={memory.cargas1rm.cleanAndJerkKg ?? ""}
              onChange={(e) => handleCargaChange("cleanAndJerkKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Snatch KB (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 24"
              className="h-8 text-xs"
              value={memory.cargas1rm.snatchKbKg ?? ""}
              onChange={(e) => handleCargaChange("snatchKbKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Jerk KB (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 2x24"
              className="h-8 text-xs"
              value={memory.cargas1rm.jerkKbKg ?? ""}
              onChange={(e) => handleCargaChange("jerkKbKg", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Long Cycle KB (kg)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex: 2x20"
              className="h-8 text-xs"
              value={memory.cargas1rm.longCycleKbKg ?? ""}
              onChange={(e) => handleCargaChange("longCycleKbKg", e.target.value)}
            />
          </div>
        </div>

        <div className="pt-2">
          <Label className="text-[11px] text-muted-foreground">Outras Cargas & Marcas</Label>
          <Input
            placeholder="Ex: Barra fixa com +15kg, Remada curvada 85kg, Pace de 5km em 4:45/km"
            className="h-8 text-xs mt-1"
            value={memory.cargas1rm.outrasCargas ?? ""}
            onChange={(e) => handleCargaChange("outrasCargas", e.target.value)}
          />
        </div>
      </div>

      {/* Seção 5: Diretrizes Estratégicas do Treinador */}
      <div className="space-y-2 rounded-xl border border-border/70 p-4 bg-card/50">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">
            Diretrizes Fixas do Coach para a IA
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Instruções permanentes que a IA deve respeitar em qualquer treino montado para este aluno.
        </p>
        <Textarea
          placeholder="Ex: Priorizar estabilização de core e ativação de glúteos no aquecimento; evitar exercícios com impacto alto repetitivo; foco em hipertrofia de membros superiores e dorsais; descanso mínimo de 75s entre séries pesadas."
          rows={3}
          className="text-xs leading-relaxed"
          value={memory.diretrizesTreinador}
          onChange={(e) =>
            setMemory((prev) => ({ ...prev, diretrizesTreinador: e.target.value }))
          }
        />
      </div>

      {/* Seção 6: Estilo & Preferências */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Estilo de Sessão & Preferências do Aluno (Opcional)</Label>
        <Input
          placeholder="Ex: Gosta de treinos intensos com alta densidade, prefere circuitos no final da sessão"
          className="h-9 text-xs"
          value={memory.estiloPreferido ?? ""}
          onChange={(e) =>
            setMemory((prev) => ({ ...prev, estiloPreferido: e.target.value }))
          }
        />
      </div>

      {/* Rodapé de Ações */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          size="default"
          className="w-full sm:w-auto min-h-[40px] px-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Gravando Memória..." : "Salvar Memória do Atleta"}
        </Button>
      </div>
    </div>
  );
}

export default AthleteMemoryPanel;
