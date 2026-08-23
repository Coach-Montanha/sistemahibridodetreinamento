import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { importExercises, projectApprovedExercises, translateCatalogBatch } from "@/lib/exercises-import.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Download, CheckCircle2, AlertCircle, RefreshCw, Languages } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { CatalogReviewList } from "./CatalogReviewList";

export function ExerciseImportManager() {
  const queryClient = useQueryClient();
  const runImport = useServerFn(importExercises);
  const runProjection = useServerFn(projectApprovedExercises);
  const runTranslation = useServerFn(translateCatalogBatch);
  const [isImporting, setIsImporting] = useState(false);
  const [isProjecting, setIsProjecting] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);


  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["exercise-catalog-stats"],
    queryFn: async () => {
      // Cálculo dinâmico do esperado via fetch do dataset
      const [catalogRes, transRes] = await Promise.all([
        supabase.from("exercise_catalog").select("id, review_status, approved_for_projection, projected_exercise_id"),
        supabase.from("exercise_catalog_translations").select("catalog_exercise_id")
      ]);

      const expectedTotal = catalogRes.data?.length || 0;
      const catalog = catalogRes.data || [];
      const translatedCount = transRes.data?.length || 0;

      return {
        expected: expectedTotal,
        total: catalog.length,
        pending: catalog.filter(d => d.review_status === 'pending').length,
        needTranslation: catalog.length - translatedCount,
        approved: catalog.filter(d => d.approved_for_projection && !d.projected_exercise_id).length,
        projected: catalog.filter(d => !!d.projected_exercise_id).length,
      };
    }
  });



  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await runImport({ data: { dryRun: false } });
      toast.success(`Importação concluída: ${result.inserted} novos registros.`);
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-stats"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] });
    } catch (error: any) {
      toast.error(`Falha na importação: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleProjection = async () => {
    setIsProjecting(true);
    try {
      const result = await runProjection();
      const motivos = Object.entries(result.reasons ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");

      if (result.projected === 0 && result.updated === 0) {
        toast.error(
          `Nenhum exercício projetado. ${result.skipped} ignorado(s).${motivos ? ` Motivos — ${motivos}` : ""}`,
          { duration: 10000 },
        );
      } else {
        toast.success(
          `${result.projected} projetado(s), ${result.updated} atualizado(s), ${result.skipped} ignorado(s).${motivos ? ` (${motivos})` : ""}`,
          { duration: 8000 },
        );
      }
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-stats"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    } catch (error: any) {
      toast.error(`Falha na projeção: ${error.message}`);
    } finally {
      setIsProjecting(false);
    }
  };


  const handleTranslation = async () => {
    setIsTranslating(true);
    let totalSuccess = 0;
    try {
      // Processar em lotes pequenos para evitar timeout e permitir feedback progressivo
      const batchSize = 10;
      const totalToTranslate = stats?.needTranslation ?? 0;
      const iterations = Math.ceil(Math.min(totalToTranslate, 50) / batchSize); // Limitar a 50 por clique para segurança

      for (let i = 0; i < iterations; i++) {
        const result = await runTranslation({ data: { limit: batchSize } });
        totalSuccess += result.success;
        queryClient.invalidateQueries({ queryKey: ["exercise-catalog-stats"] });
        queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] });
      }
      
      toast.success(`Tradução concluída: ${totalSuccess} exercícios traduzidos.`);
    } catch (error: any) {
      toast.error(`Falha na tradução: ${error.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  return (

    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          title="Total no Catálogo" 
          value={stats?.total ?? 0} 
          icon={Database} 
          loading={statsLoading} 
          color="text-primary"
        />

        <StatCard 
          title="Aguardando Revisão" 
          value={stats?.pending ?? 0} 
          icon={AlertCircle} 
          color="text-amber-500"
          loading={statsLoading} 
        />
        <StatCard 
          title="Prontos p/ Projeção" 
          value={stats?.approved ?? 0} 
          icon={CheckCircle2} 
          color="text-green-500"
          loading={statsLoading} 
        />
        <StatCard 
          title="Já Projetados" 
          value={stats?.projected ?? 0} 
          icon={RefreshCw} 
          loading={statsLoading} 
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sincronização do Dataset</CardTitle>
              <CardDescription>
                Gerencie os exercícios do catálogo e projete itens aprovados para a biblioteca oficial do sistema.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleProjection} 
                disabled={isProjecting || (stats?.approved ?? 0) === 0}
              >
                {isProjecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                Projetar Aprovados
              </Button>
            </div>

          </div>
        </CardHeader>
        <CardContent>
          <CatalogReviewList />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, loading }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
            )}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

import { cn } from "@/lib/utils";
