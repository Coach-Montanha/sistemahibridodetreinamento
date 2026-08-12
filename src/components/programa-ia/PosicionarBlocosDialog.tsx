import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { SortableList, SortableRow } from "@/components/dnd/sortable-list";
import type { ModalidadeHibrida } from "@/lib/hibrido-ia.server";
import { arrayMove } from "@dnd-kit/sortable";

interface PosicionarBlocosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programaId: string;
  modalidade: ModalidadeHibrida;
  onFinish: () => void;
}

export function PosicionarBlocosDialog({
  open,
  onOpenChange,
  programaId,
  modalidade,
  onFinish,
}: PosicionarBlocosDialogProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [localSessoes, setLocalSessoes] = useState<any[]>([]);

  // Busca as sessões do programa recém-criado
  const { data: sessoes = [], isLoading } = useQuery({
    queryKey: ["programa-posicionar-sessoes", programaId],
    queryFn: async () => {
      const { data: weeks } = await supabase
        .from("program_weeks")
        .select("id")
        .eq("program_id", programaId);
      
      if (!weeks?.length) return [];
      
      const weekIds = weeks.map(w => w.id);
      const { data: sess, error } = await supabase
        .from("sessions")
        .select(`
          id,
          titulo,
          numero_dia,
          program_week_id,
          session_blocks (
            id,
            ordem,
            titulo,
            formato
          )
        `)
        .in("program_week_id", weekIds)
        .order("numero_dia", { ascending: true });

      if (error) throw error;
      return sess || [];
    },
    enabled: open && !!programaId,
  });

  useEffect(() => {
    if (sessoes.length > 0) {
      setLocalSessoes(sessoes);
    }
  }, [sessoes]);

  const handleReorder = (activeId: string, overId: string) => {
    setLocalSessoes((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === activeId);
      const newIndex = prev.findIndex((s) => s.id === overId);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const salvarMut = useMutation({
    mutationFn: async () => {
      setLoading(true);
      const promises = localSessoes.map((s, idx) => 
        supabase
          .from("sessions")
          .update({ numero_dia: idx + 1 })
          .eq("id", s.id)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error("Falha ao salvar a nova ordem");
    },
    onSuccess: () => {
      toast.success("Ordem dos treinos atualizada!");
      qc.invalidateQueries({ queryKey: ["programas"] });
      onFinish();
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setLoading(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Posicionar Treinos</DialogTitle>
          <DialogDescription>
            Arraste os treinos para definir a ordem final na semana.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">Carregando sessões...</div>
          ) : localSessoes.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">Nenhuma sessão encontrada.</div>
          ) : (
            <SortableList
              ids={localSessoes.map(s => s.id)}
              onReorder={handleReorder}
            >
              <div className="space-y-2">
                {localSessoes.map((s) => (
                  <SortableRow key={s.id} id={s.id}>
                    <div className="flex-1 py-1">
                      <div className="text-sm font-medium">{s.titulo}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Dia Sugerido {s.numero_dia} · {s.session_blocks?.length || 0} blocos
                      </div>
                    </div>
                  </SortableRow>
                ))}
              </div>
            </SortableList>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={() => salvarMut.mutate()} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : "Confirmar Ordem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

