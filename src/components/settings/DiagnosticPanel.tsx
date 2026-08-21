import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { getDiagnosticInfo } from "@/lib/diagnostico.functions";
import { Loader2, RefreshCw, Database, Shield, Server, Info } from "lucide-react";
import { toast } from "sonner";

export function DiagnosticPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const runDiagnostic = useServerFn(getDiagnosticInfo);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await runDiagnostic();
      setData(res);
      toast.success("Diagnóstico concluído");
    } catch (err: any) {
      toast.error("Erro no diagnóstico: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-md">
          Execute uma verificação técnica para comparar o estado deste ambiente com o banco de dados e storage.
        </p>
        <Button onClick={handleRun} disabled={loading} size="sm">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Executar Diagnóstico
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Server className="h-3 w-3" /> Ambiente
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Projeto:</span>
                <span className="font-mono">{data.env?.projectRef}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Build:</span>
                <span className="font-mono">{data.env?.buildId}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="h-3 w-3" /> Autenticação
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coach ID:</span>
                <span className="font-mono text-xs truncate max-w-[150px]">{data.auth?.coachId || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono text-xs truncate max-w-[150px]">{data.auth?.userId}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-3 col-span-full">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Database className="h-3 w-3" /> Banco de Dados
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold">{data.database?.exercise_media}</p>
                <p className="text-[10px] text-muted-foreground">Mídias Registradas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.database?.exercises}</p>
                <p className="text-[10px] text-muted-foreground">Exercícios Totais</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.database?.correlation_jobs}</p>
                <p className="text-[10px] text-muted-foreground">Jobs de Sincronia</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.database?.correlation_items}</p>
                <p className="text-[10px] text-muted-foreground">Itens Inventariados</p>
              </div>
            </div>
          </Card>

          {data.lastJob && (
            <Card className="p-4 space-y-3 col-span-full bg-muted/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Info className="h-3 w-3" /> Último Job
              </h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground mr-2">Data:</span>
                  {new Date(data.lastJob.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">Status:</span>
                  <span className={data.lastJob.status === 'completed' ? 'text-green-500' : 'text-amber-500'}>
                    {data.lastJob.status}
                  </span>
                </div>
                <div className="w-full text-xs font-mono bg-background/50 p-2 rounded">
                  Stats: {JSON.stringify(data.lastJob.stats)}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
