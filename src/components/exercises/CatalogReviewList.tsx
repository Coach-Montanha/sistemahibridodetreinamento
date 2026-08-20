import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Eye, Loader2, Save, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { translateSingleExercise } from "@/lib/exercises-import.functions";

export function CatalogReviewList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const pageSize = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ["exercise-catalog-list", page, search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("exercise_catalog")
        .select(`
          *,
          exercise_catalog_translations (*)
        `, { count: 'exact' });

      if (search) {
        query = query.ilike("name_original", `%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("review_status", statusFilter);
      }

      const { data, error, count } = await query
        .order("name_original", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return {
        items: (data as any[]).map(item => ({
          ...item,
          exercise_catalog_translations: Array.isArray(item.exercise_catalog_translations) 
            ? item.exercise_catalog_translations 
            : item.exercise_catalog_translations ? [item.exercise_catalog_translations] : []
        })),
        total: count || 0
      };
    }
  });

  const items = data?.items;
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, approved }: { id: string, status: string, approved: boolean }) => {
      const { error } = await supabase
        .from("exercise_catalog")
        .update({ 
          review_status: status, 
          approved_for_projection: approved,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-stats"] });
      toast.success("Status atualizado");
    },
    onError: (error: any) => {
      toast.error(`Falha ao atualizar: ${error.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-8 text-center">
        <p className="text-sm font-medium text-destructive mb-2">Erro ao carregar catálogo</p>
        <p className="text-xs text-muted-foreground mb-4">{(error as any).message}</p>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] })}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <Input 
            placeholder="Buscar por nome..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status:</Label>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exercício (EN / PT)</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Tradução</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Projeção</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!items || items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum exercício no catálogo.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.name_original}</span>
                      {item.exercise_catalog_translations?.[0]?.name_pt_br && (
                        <span className="text-sm text-primary">{item.exercise_catalog_translations[0].name_pt_br}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{item.muscle_group} / {item.body_part}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline">{item.equipment_original}</Badge>
                      {item.exercise_catalog_translations?.[0]?.equipment_pt_br && (
                        <Badge variant="secondary" className="text-[10px]">{item.exercise_catalog_translations[0].equipment_pt_br}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TranslationStatusBadge translation={item.exercise_catalog_translations?.[0]} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.review_status} />
                  </TableCell>
                  <TableCell>
                    {item.projected_exercise_id ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Concluída
                      </Badge>
                    ) : item.approved_for_projection ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Aprovada
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Traduzir via IA"
                        onClick={async () => {
                          try {
                            await translateSingleExercise({ data: { id: item.id } });
                            queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] });
                            toast.success("Tradução solicitada");
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                      >
                        <Wand2 className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle>Revisão: {item.name_original}</DialogTitle>
                          </DialogHeader>
                          <CatalogItemReview item={item} onUpdated={() => queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] })} />
                        </DialogContent>
                      </Dialog>

                      {!item.projected_exercise_id && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => updateStatus.mutate({ id: item.id, status: 'approved', approved: true })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={() => updateStatus.mutate({ id: item.id, status: 'rejected', approved: false })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Mostrando {page * pageSize + 1} a {Math.min((page + 1) * pageSize, totalCount)} de {totalCount} exercícios
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <div className="text-sm font-medium">
              Página {page + 1} de {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-500">Aprovado</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejeitado</Badge>;
    default:
      return <Badge variant="outline">Pendente</Badge>;
  }
}

function TranslationStatusBadge({ translation }: { translation: any }) {
  if (!translation) return <Badge variant="outline" className="opacity-50">Nenhuma</Badge>;
  
  switch (translation.translation_status) {
    case 'approved':
      return <Badge className="bg-green-500">Traduzido</Badge>;
    case 'draft':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">IA (Rascunho)</Badge>;
    default:
      return <Badge variant="outline">Pendente</Badge>;
  }
}

function CatalogItemReview({ item, onUpdated }: { item: any, onUpdated: () => void }) {
  const queryClient = useQueryClient();
  const translation = item.exercise_catalog_translations?.[0];
  const [edited, setEdited] = useState({
    name_pt_br: translation?.name_pt_br || "",
    equipment_pt_br: translation?.equipment_pt_br || "",
    category_pt_br: translation?.category_pt_br || "",
    body_part_pt_br: translation?.body_part_pt_br || "",
    muscle_group_pt_br: translation?.muscle_group_pt_br || "",
    instructions_pt_br: translation?.instructions_pt_br || ""
  });

  // Efeito para atualizar campos quando a tradução mudar (após Wand2)
  useState(() => {
    if (translation) {
      setEdited({
        name_pt_br: translation.name_pt_br || "",
        equipment_pt_br: translation.equipment_pt_br || "",
        category_pt_br: translation.category_pt_br || "",
        body_part_pt_br: translation.body_part_pt_br || "",
        muscle_group_pt_br: translation.muscle_group_pt_br || "",
        instructions_pt_br: translation.instructions_pt_br || ""
      });
    }
  });


  const translateMutation = useMutation({
    mutationFn: async () => {
      await translateSingleExercise({ data: { id: item.id } });
    },
    onSuccess: () => {
      toast.success("Tradução via IA concluída");
      onUpdated();
      // Recarregar os campos editados se a tradução mudou
      queryClient.invalidateQueries({ queryKey: ["exercise-catalog-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("exercise_catalog_translations")
        .upsert({
          catalog_exercise_id: item.id,
          locale: "pt-BR",
          ...edited,
          translation_status: "approved",
          translation_source: "human"
        });
      if (error) throw error;

      // Também aprovar o exercício para projeção ao salvar manualmente
      await supabase
        .from("exercise_catalog")
        .update({ 
          review_status: 'approved',
          approved_for_projection: true
        })
        .eq("id", item.id);
    },
    onSuccess: () => {
      toast.success("Tradução salva e aprovada");
      onUpdated();
    }
  });

  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <Badge variant={translation ? "default" : "outline"}>
            {translation ? "Possui Tradução" : "Sem Tradução"}
          </Badge>
          {translation?.translation_status === 'draft' && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">Rascunho IA</Badge>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => translateMutation.mutate()}
          disabled={translateMutation.isPending}
          className="gap-2"
        >
          {translateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Regerar via IA
        </Button>
      </div>
      <ScrollArea className="max-h-[70vh] px-1">

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4 opacity-70">
            <h3 className="font-bold flex items-center gap-2 border-b pb-2">
              Original (EN)
            </h3>
            
            <div>
              <Label className="text-xs">Name</Label>
              <p className="font-medium">{item.name_original}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Equipment</Label>
                <p className="text-sm">{item.equipment_original}</p>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <p className="text-sm">{item.category}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Instructions</Label>
              <div className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">
                {typeof item.instructions === 'string' 
                  ? item.instructions 
                  : JSON.stringify(item.instructions, null, 2)}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-l pl-8">
            <h3 className="font-bold flex items-center gap-2 border-b pb-2 text-primary">
              Tradução (PT-BR)
            </h3>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome do Exercício</Label>
                <Input 
                  value={edited.name_pt_br} 
                  onChange={e => setEdited(prev => ({ ...prev, name_pt_br: e.target.value }))}
                  placeholder="Ex: Supino Reto com Halteres"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Equipamento</Label>
                  <Input 
                    value={edited.equipment_pt_br} 
                    onChange={e => setEdited(prev => ({ ...prev, equipment_pt_br: e.target.value }))}
                    placeholder="Ex: Halteres"
                  />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Input 
                    value={edited.category_pt_br} 
                    onChange={e => setEdited(prev => ({ ...prev, category_pt_br: e.target.value }))}
                    placeholder="Ex: Força"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Instruções Traduzidas</Label>
                <Textarea 
                  value={edited.instructions_pt_br} 
                  onChange={e => setEdited(prev => ({ ...prev, instructions_pt_br: e.target.value }))}
                  placeholder="Passo a passo em português..."
                  rows={12}
                  className="text-sm"
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Tradução e Aprovar
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
