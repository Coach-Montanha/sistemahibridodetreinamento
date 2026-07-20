import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Plus, Save, Download, ImageDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBuilder } from "@/lib/session-builder-store";
import { BLOCK_FORMAT_LABEL, type BlockFormat } from "@/lib/methodology";
import { useFormatRegistry } from "@/lib/format-registry";
import { BlockCard } from "./BlockCard";
import { exportarSessaoPDF, exportarSessaoExcel } from "@/lib/session-export";
import { ExportImageDialog } from "@/components/session/ExportImageDialog";

export function SessionBuilder({
  sessionId,
  programWeekId,
}: {
  sessionId?: string;
  programWeekId?: string;
}) {
  const navigate = useNavigate();
  const state = useBuilder();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const { presets } = useFormatRegistry();
  const [imgOpen, setImgOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      state.reset();
      return;
    }
    // load existing session
    (async () => {
      const { data: session } = await supabase
        .from("sessions")
        .select("id, titulo, numero_dia, data")
        .eq("id", sessionId)
        .single();
      if (!session) return;
      const { data: blocks } = await supabase
        .from("session_blocks")
        .select("*, session_block_exercises(*, exercises(nome_pt))")
        .eq("session_id", sessionId)
        .order("ordem");
      state.hydrate({
        titulo: session.titulo ?? "",
        numero_dia: session.numero_dia,
        data: session.data,
        blocks: (blocks ?? []).map((b: any) => ({
          tempId: b.id,
          id: b.id,
          formato: b.formato,
          titulo: b.titulo,
          duracao_min: b.duracao_min,
          ordem: b.ordem,
          config: b.config ?? {},
          exercises: (b.session_block_exercises ?? [])
            .sort((a: any, z: any) => a.ordem - z.ordem)
            .map((e: any) => ({
              tempId: e.id,
              exercise_id: e.exercise_id,
              nome_livre: e.nome_livre ?? e.exercises?.nome_pt ?? null,
              ordem: e.ordem,
              reps: e.reps,
              series: e.series,
              pct_1rm: e.pct_1rm,
              carga_kg: e.carga_kg,
              descanso_seg: e.descanso_seg,
              lado: e.lado,
              observacoes: e.observacoes,
              slot: (b.config?.slots?.[String(e.ordem)] ?? null) as any,
            })),
        })),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = state.blocks.findIndex((b) => b.tempId === active.id);
    const to = state.blocks.findIndex((b) => b.tempId === over.id);
    if (from < 0 || to < 0) return;
    state.reorderBlocks(from, to);
  }

  async function save(publicar: boolean) {
    if (!state.blocks.length) return toast.error("Adicione pelo menos um bloco.");

    try {
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        // precisa de programa/semana para atender ao FK program_week_id
        // MVP: criar um "programa rascunho" pessoal + semana 1 se não houver
        let weekId = programWeekId;
        if (!weekId) {
          const { data: coach } = await supabase
            .from("coaches")
            .select("id")
            .maybeSingle();
          if (!coach) throw new Error("Perfil de treinador não encontrado");
          const { data: prog, error: pe } = await supabase
            .from("programs")
            .insert({
              coach_id: coach.id,
              metodologia: "hibrido",
              titulo: "Rascunhos avulsos",
              data_inicio: new Date().toISOString().slice(0, 10),
              duracao_semanas: 1,
            })
            .select("id")
            .single();
          if (pe) throw pe;
          const { data: wk, error: we } = await supabase
            .from("program_weeks")
            .insert({ program_id: prog.id, numero_semana: 1 })
            .select("id")
            .single();
          if (we) throw we;
          weekId = wk.id;
        }

        const { data: sess, error: se } = await supabase
          .from("sessions")
          .insert({
            program_week_id: weekId,
            numero_dia: state.numero_dia,
            titulo: state.titulo || null,
            data: state.data,
            status: publicar ? "publicada" : "rascunho",
          })
          .select("id")
          .single();
        if (se) throw se;
        currentSessionId = sess.id;
      } else {
        const { error: ue } = await supabase
          .from("sessions")
          .update({
            titulo: state.titulo || null,
            numero_dia: state.numero_dia,
            data: state.data,
            status: publicar ? "publicada" : "rascunho",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", currentSessionId);
        if (ue) throw ue;

        // wipe & recreate blocks (simpler for MVP)
        await supabase
          .from("session_blocks")
          .delete()
          .eq("session_id", currentSessionId);
      }

      for (const b of state.blocks) {
        const slots: Record<string, string> = {};
        b.exercises.forEach((e) => {
          if (e.slot) slots[String(e.ordem)] = e.slot;
        });
        const configToSave = {
          ...b.config,
          ...(Object.keys(slots).length ? { slots } : {}),
        };
        const { data: bIns, error: be } = await supabase
          .from("session_blocks")
          .insert({
            session_id: currentSessionId,
            ordem: b.ordem,
            formato: b.formato,
            titulo: b.titulo || null,
            duracao_min: b.duracao_min ?? null,
            config: configToSave,
          })
          .select("id")
          .single();
        if (be) throw be;

        if (b.exercises.length) {
          const rows = b.exercises.map((e) => ({
            session_block_id: bIns.id,
            exercise_id: e.exercise_id ?? null,
            nome_livre: e.nome_livre ?? null,
            ordem: e.ordem,
            reps: e.reps ?? null,
            series: e.series ?? null,
            pct_1rm: e.pct_1rm ?? null,
            carga_kg: e.carga_kg ?? null,
            descanso_seg: e.descanso_seg ?? null,
            lado: e.lado ?? null,
            observacoes: e.observacoes ?? null,
          }));
          const { error: xe } = await supabase
            .from("session_block_exercises")
            .insert(rows);
          if (xe) throw xe;
        }
      }

      toast.success(publicar ? "Sessão publicada" : "Rascunho salvo");
      navigate({ to: "/app/sessoes/$id", params: { id: currentSessionId! } });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {sessionId ? "Editar sessão" : "Nova sessão"}
        </h1>
        <div className="flex gap-2">
          {sessionId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() =>
                    exportarSessaoPDF(sessionId).catch((e) => toast.error(e.message))
                  }
                >
                  PDF com marca
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportarSessaoExcel(sessionId).catch((e) => toast.error(e.message))
                  }
                >
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImgOpen(true)}>
                  <ImageDown className="mr-2 h-4 w-4" /> Imagem (PNG/JPG)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" onClick={() => save(false)}>
            <Save className="mr-2 h-4 w-4" /> Salvar rascunho
          </Button>
          <Button onClick={() => save(true)}>Publicar</Button>
        </div>
      </div>
      {sessionId && (
        <ExportImageDialog
          open={imgOpen}
          onOpenChange={setImgOpen}
          sessionId={sessionId}
        />
      )}

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex: D1 · Fitness A/E2MOM"
              value={state.titulo}
              onChange={(e) => state.setMeta({ titulo: e.target.value })}
            />
          </div>
          <div>
            <Label>Dia</Label>
            <Input
              type="number"
              value={state.numero_dia}
              onChange={(e) => state.setMeta({ numero_dia: Number(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={state.blocks.map((b) => b.tempId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {state.blocks.map((b) => (
              <BlockCard key={b.tempId} block={b} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Adicionar bloco
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[240px]">
            {presets.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() =>
                  state.addBlock(p.base as BlockFormat, {
                    titulo: p.builtin ? null : p.label,
                    config: p.defaults,
                  })
                }
                className="flex items-center justify-between gap-3"
              >
                <span className="font-medium">{p.label}</span>
                {!p.builtin && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {BLOCK_FORMAT_LABEL[p.base]}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}