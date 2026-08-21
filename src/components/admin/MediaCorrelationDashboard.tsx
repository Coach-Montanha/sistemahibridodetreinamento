import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Database, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FileText, 
  PlayCircle, 
  Image as ImageIcon,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startMediaInventory, getLatestCorrelationJob, applyAutoCorrelation } from "@/lib/correlation.functions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function MediaCorrelationDashboard() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["latest-correlation-job"],
    queryFn: () => getLatestCorrelationJob()
  });

  const inventoryMutation = useMutation({
    mutationFn: startMediaInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["latest-correlation-job"] });
      toast.success("Inventário concluído!");
      setIsSyncing(false);
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
      setIsSyncing(false);
    }
  });

  const applyMutation = useMutation({
    mutationFn: (jobId: string) => applyAutoCorrelation({ data: { jobId } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["latest-correlation-job"] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success(`${res.applied} mídias vinculadas com sucesso!`);
    }
  });

  const handleRunInventory = () => {
    setIsSyncing(true);
    inventoryMutation.mutate({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = job?.stats as any || { total_files: 0, exact_matches: 0, ambiguous_matches: 0, no_matches: 0, applied: 0 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Arquivos" value={stats.total_files} icon={Database} />
        <StatCard title="Correspondências" value={stats.exact_matches} icon={CheckCircle2} color="text-green-500" />
        <StatCard title="Ambiguidades" value={stats.ambiguous_matches} icon={AlertTriangle} color="text-amber-500" />
        <StatCard title="Já Aplicados" value={stats.applied} icon={ArrowRight} color="text-primary" />
      </div>

      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border/50">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Status do Inventário</h3>
          <p className="text-xs text-muted-foreground">
            {job ? `Última verificação em ${format(new Date(job.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}` : "Nenhum inventário realizado ainda."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRunInventory} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Novo Inventário
          </Button>
          {job && stats.exact_matches > stats.applied && (
            <Button size="sm" onClick={() => applyMutation.mutate(job.id)} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Aplicar {stats.exact_matches - stats.applied} Vínculos
            </Button>
          )}
        </div>
      </div>

      {job && job.media_correlation_items && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center justify-between">
              Inventário de Mídia
              <Badge variant="outline">{job.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background border-b z-10">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Arquivo</th>
                    <th className="p-3 font-medium">Tipo Match</th>
                    <th className="p-3 font-medium">Exercício Alvo</th>
                    <th className="p-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {job.media_correlation_items.map((item: any) => (
                    <tr key={item.id} className="group hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {item.filename.endsWith('.gif') ? <ImageIcon className="h-3 w-3 text-muted-foreground" /> : <PlayCircle className="h-3 w-3 text-primary" />}
                          <span className="truncate max-w-[200px]" title={item.storage_path}>{item.filename}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {item.match_type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {item.matched_exercise_id ? (
                          <div className="flex items-center gap-1 text-primary">
                            <span className="truncate max-w-[150px]">Vinculado</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {item.status === 'applied' ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-transparent">Aplicado</Badge>
                        ) : item.status === 'pending' ? (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30">Pendente</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">Revisão</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold flex items-center justify-between">
          <span className={color}>{value}</span>
          <Icon className="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}
