import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GitMerge, 
  Trash2, 
  ChevronLeft, 
  Loader2,
  Globe2
} from "lucide-react";
import { toast } from "sonner";
import { useCoach } from "@/hooks/use-coach";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { useState } from "react";


export const Route = createFileRoute("/_authenticated/app/exercicios/duplicados")({
  component: DuplicadosPage,
});

function DuplicadosPage() {
  const { data: coach } = useCoach();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: duplicates = [], isLoading } = useQuery({
    queryKey: ["exercises", "duplicates"],
    queryFn: async () => {
      if (!coach?.id) return [];
      const { data, error } = await (supabase.rpc as any)('find_duplicate_exercises', { 
        _coach_id: coach.id 
      });
      if (error) throw error;
      
      const groups: Record<string, any[]> = {};
      (data as any[] || []).forEach((ex: any) => {
        const key = ex.nome_pt.toLowerCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(ex);
      });
      
      return Object.entries(groups).map(([name, items]) => ({
        name,
        items
      }));
    },
    enabled: !!coach?.id
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ keeperId, duplicateIds }: { keeperId: string, duplicateIds: string[] }) => {
      const { error } = await supabase.rpc("merge_exercises", {
        _keeper_id: keeperId,
        _duplicate_ids: duplicateIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exercícios fundidos com sucesso");
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exercício excluído");
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app/exercicios" })}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Limpeza de Duplicados</h1>
          <p className="text-sm text-muted-foreground">
            quero poder fundir os exercícios marcados com "Global", são eles que estão duplicados
          </p>
        </div>
      </div>

      {duplicates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-3">
            <GitMerge className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium">Tudo limpo!</h3>
          <p className="text-muted-foreground">Não foram encontrados exercícios duplicados no seu catálogo.</p>
          <Button 
            className="mt-6" 
            onClick={() => navigate({ to: "/app/exercicios" })}
          >
            Voltar ao Banco
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {duplicates.map((group) => (
            <Card key={group.name} className="overflow-hidden border-border/60">
              <div className="bg-muted/30 px-4 py-2 border-b border-border/40">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Grupo: {group.name}
                </span>
              </div>
              <div className="divide-y divide-border/40">
                {group.items.map((ex: any) => {
                  const isGlobal = !ex.coach_id;
                  const isBusy = busyId === ex.id;
                  
                  return (
                    <div key={ex.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-accent/5 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ex.nome_pt}</span>
                          {isGlobal && (
                            <Badge variant="outline" className="gap-1 text-[10px] uppercase">
                              <Globe2 className="h-3 w-3" /> Global
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ex.equipamento?.map((eq: string) => (
                            <Badge key={eq} variant="secondary" className="text-[10px]">{eq}</Badge>
                          ))}
                          {ex.metodologias?.map((m: Methodology) => (
                            <Badge key={m} variant="outline" className="text-[10px]">{METHODOLOGY_LABEL[m]}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={async () => {
                            const duplicateIds = group.items
                              .filter((i: any) => i.id !== ex.id && i.coach_id === coach?.id)
                              .map((i: any) => i.id);
                            
                            if (duplicateIds.length === 0) {
                              toast.info("Não há exercícios pessoais neste grupo para fundir neste item.");
                              return;
                            }

                            if (confirm(`Deseja fundir os ${duplicateIds.length} exercícios pessoais deste grupo em "${ex.nome_pt}"?`)) {
                              setBusyId(ex.id);
                              await mergeMutation.mutateAsync({ keeperId: ex.id, duplicateIds });
                              setBusyId(null);
                            }
                          }}
                          disabled={!!busyId}
                        >
                          {isBusy && busyId === ex.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
                          Manter e Fundir
                        </Button>
                        
                        {!isGlobal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              if (confirm(`Excluir permanentemente seu exercício "${ex.nome_pt}"?`)) {
                                setBusyId(ex.id);
                                await deleteMutation.mutateAsync(ex.id);
                                setBusyId(null);
                              }
                            }}
                            disabled={!!busyId}
                          >
                            {isBusy && busyId === ex.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
