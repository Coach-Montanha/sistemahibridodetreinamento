import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { importExercises, projectApprovedExercises } from "@/lib/exercises-import.functions";
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
  const { translateCatalogBatch } = await import("@/lib/exercises-import.functions");
  const runTranslation = useServerFn(translateCatalogBatch);
  const [isImporting, setIsImporting] = useState(false);
  const [isProjecting, setIsProjecting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);


  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["exercise-catalog-stats"],
    queryFn: async () => {
      const { data: catalog, error: catError } = await supabase
        .from("exercise_catalog")
        .select("id, review_status, approved_for_projection, projected_exercise_id");
      
      if (catError) throw catError;

      const { data: translations, error: transError } = await supabase
        .from("exercise_catalog_translations")
        .select("catalog_exercise_id, translation_status");
      
      if (transError) throw transError;

      const translatedIds = new Set((translations || []).map(t => t.catalog_exercise_id));

      return {
        total: catalog.length,
        pending: catalog.filter(d => d.review_status === 'pending').length,
        needTranslation: catalog.length - translatedIds.size,
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
      toast.success(`${result.projected} exercícios projetados para a biblioteca global.`);
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-stats"] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    } catch (error: any) {
      toast.error(`Falha na projeção: ${error.message}`);
    } finally {
      setIsProjecting(false);
    }
  };

  const handleTranslation = async () => {
    setIsTranslating(true);
    try {
      const result = await runTranslation({ data: { limit: 10 } });
      toast.success(`Tradução concluída: ${result.success} exercícios traduzidos.`);
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-stats"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] });
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
                Importe exercícios do repositório GitHub e projete itens aprovados para a biblioteca oficial.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleImport} 
                disabled={isImporting}
              >
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                GitHub
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTranslation} 
                disabled={isTranslating || (stats?.needTranslation ?? 0) === 0}
              >
                {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                Traduzir via IA
              </Button>
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
