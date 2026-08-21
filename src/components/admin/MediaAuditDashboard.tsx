import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ShieldAlert, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Info,
  FileSearch,
  RefreshCcw
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startMediaAudit, getLatestAuditReport } from "@/lib/audit.functions";
import { repairPendingExerciseLinks } from "@/lib/repair.functions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function MediaAuditDashboard() {
  const queryClient = useQueryClient();
  const [isAuditing, setIsAuditing] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ["latest-audit-report"],
    queryFn: () => getLatestAuditReport()
  });

  const auditMutation = useMutation({
    mutationFn: startMediaAudit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["latest-audit-report"] });
      toast.success("Auditoria concluída!");
      setIsAuditing(false);
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
      setIsAuditing(false);
    }
  });

  const repairMutation = useMutation({
    mutationFn: (dryRun: boolean) => repairPendingExerciseLinks({ data: { dryRun } }),
    onSuccess: (res) => {
      if (res.dryRun) {
        toast.info(`Simulação: ${res.repaired} vínculos podem ser reparados.`);
      } else {
        toast.success(`${res.repaired} vínculos reparados com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ["exercises"] });
      }
    }
  });

  const handleRunAudit = () => {
    setIsAuditing(true);
    auditMutation.mutate({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const summary = report?.summary as any || { total_files: 0, orphaned_files: 0, duplicates_found: 0, size_total: 0 };
  const items = (report as any)?.media_audit_items || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Arquivos" value={summary.total_files} icon={FileSearch} />
        <StatCard title="Duplicados" value={summary.duplicates_found} icon={AlertTriangle} color="text-amber-500" />
        <StatCard title="Órfãos (Sem vínculo)" value={summary.orphaned_files} icon={ShieldAlert} color="text-destructive" />
        <StatCard title="Tamanho Total" value={`${((summary.size_total || 0) / 1024 / 1024).toFixed(1)} MB`} icon={Info} />
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-muted/30 p-4 rounded-lg border border-border/50">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Auditoria de Integridade</h3>
          <p className="text-xs text-muted-foreground">
            {report?.created_at ? `Última auditoria em ${format(new Date(report.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}` : "Nenhuma auditoria realizada."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRunAudit} disabled={isAuditing}>
            {isAuditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Iniciar Auditoria
          </Button>
          <Button variant="secondary" size="sm" onClick={() => repairMutation.mutate(true)} disabled={repairMutation.isPending}>
            {repairMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Simular Reparo
          </Button>
          <Button size="sm" onClick={() => repairMutation.mutate(false)} disabled={repairMutation.isPending}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Executar Reparo Real
          </Button>
        </div>
      </div>

      {report && items.length > 0 && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center justify-between">
              Relatório Detalhado
              <Badge variant="outline">{report.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background border-b z-10">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Caminho no Storage</th>
                    <th className="p-3 font-medium">Tamanho</th>
                    <th className="p-3 font-medium">Problema</th>
                    <th className="p-3 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item: any) => (
                    <tr key={item.id} className="group hover:bg-muted/50">
                      <td className="p-3">
                        <span className="truncate max-w-[300px] block" title={item.storage_path}>
                          {item.storage_path}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {((item.size || 0) / 1024).toFixed(1)} KB
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {item.is_duplicate && <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-transparent">Duplicado</Badge>}
                          {item.is_orphaned && <Badge variant="secondary" className="bg-destructive/10 text-destructive border-transparent">Órfão</Badge>}
                          {!item.is_duplicate && !item.is_orphaned && <span className="text-green-500">Saudável</span>}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
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
