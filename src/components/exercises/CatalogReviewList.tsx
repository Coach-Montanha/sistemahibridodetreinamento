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
import { Check, X, Eye, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CatalogReviewList() {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["exercise-catalog-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_catalog")
        .select("*")
        .order("imported_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Exercício</TableHead>
            <TableHead>Equipamento (Original)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Projeção</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!items || items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhum exercício no catálogo.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{item.name_original}</span>
                    <span className="text-xs text-muted-foreground">{item.muscle_group} / {item.body_part}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.equipment_original}</Badge>
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{item.name_original}</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold text-muted-foreground">Categoria</h4>
                                <p>{item.category}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-muted-foreground">Equipamento</h4>
                                <p>{item.equipment_original}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-muted-foreground">Instruções</h4>
                              <pre className="mt-2 whitespace-pre-wrap text-sm bg-muted p-3 rounded">
                                {JSON.stringify(item.instructions, null, 2)}
                              </pre>
                            </div>
                            {item.gif_path && (
                              <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">GIF / Imagem</h4>
                                <a 
                                  href={item.gif_path} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                                >
                                  Ver mídia externa <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
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
