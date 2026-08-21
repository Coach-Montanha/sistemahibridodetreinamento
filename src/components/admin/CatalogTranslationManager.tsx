import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Languages, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Info
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startCatalogTranslationJob, processCatalogTranslationBatch, getLatestTranslationJob } from "@/lib/translation-job.functions";
import { toast } from "sonner";

export function CatalogTranslationManager() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["latest-translation-job"],
    queryFn: () => getLatestTranslationJob(),
    refetchInterval: isProcessing ? 2000 : false
  });

  const startMutation = useMutation({
    mutationFn: startCatalogTranslationJob,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["latest-translation-job"] });
      if (res.jobId) {
        toast.success(`Job iniciado para ${res.total} exercícios!`);
        handleStartProcessing(res.jobId);
      } else {
        toast.info(res.message);
      }
    }
  });

  const processMutation = useMutation({
    mutationFn: (args: { jobId: string, batchSize: number }) => processCatalogTranslationBatch({ data: args }),
    onSuccess: (res) => {
      if (res.status === "completed") {
        setIsProcessing(false);
        toast.success("Tradução em massa finalizada!");
      } else if (isProcessing) {
        // Continue processando o próximo lote se ainda estiver ativo
        processMutation.mutate({ jobId: job?.id!, batchSize: 10 });
      }
    },
    onError: () => {
      setIsProcessing(false);
      toast.error("Falha ao processar lote de tradução.");
    }
  });

  const handleStartProcessing = (jobId: string) => {
    setIsProcessing(true);
    processMutation.mutate({ jobId, batchSize: 10 });
  };

  const handlePause = () => {
    setIsProcessing(false);
    toast.info("Processamento pausado. Você pode retomar a qualquer momento.");
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const processedItems = job?.processed_items ?? 0;
  const totalItems = job?.total_items ?? 1;
  const progress = Math.round((processedItems / totalItems) * 100);
  const isCompleted = job?.status === "completed";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            Tradução em Massa (IA)
          </CardTitle>
          <CardDescription>
            Traduz automaticamente o catálogo de exercícios para Português usando Gemini 2.0 Flash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!job || isCompleted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <Languages className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Pronto para Traduzir</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Existem novos exercícios no catálogo que ainda não possuem tradução aprovada.
                </p>
              </div>
              <Button onClick={() => startMutation.mutate({})} disabled={startMutation.isPending}>
                {startMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Iniciar Novo Job de Tradução
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Progresso da Tradução</span>
                  <p className="text-xs text-muted-foreground">
                    {processedItems} de {totalItems} processados
                  </p>
                </div>
                <Badge variant={isProcessing ? "default" : "secondary"}>
                  {isProcessing ? "Processando..." : "Pausado"}
                </Badge>
              </div>
              
              <Progress value={progress} className="h-2" />
              
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-green-500">{job.success_count ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Sucessos</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-destructive">{job.error_count ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Erros</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold">{totalItems - processedItems}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Restantes</div>
                </div>
              </div>

              <div className="flex justify-center gap-2">
                {!isProcessing ? (
                  <Button onClick={() => handleStartProcessing(job.id)}>
                    <Play className="mr-2 h-4 w-4" /> Retomar
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handlePause}>
                    <Pause className="mr-2 h-4 w-4" /> Pausar
                  </Button>
                )}
                <Button variant="ghost" onClick={() => startMutation.mutate({})}>
                  Reiniciar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex gap-3 text-amber-700">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <p className="text-xs">
          <strong>Importante:</strong> As traduções geradas por IA são salvas como "Rascunho". 
          Após a tradução, você deve revisar e aprovar os exercícios no Catálogo para que eles fiquem disponíveis no gerador.
        </p>
      </div>
    </div>
  );
}
