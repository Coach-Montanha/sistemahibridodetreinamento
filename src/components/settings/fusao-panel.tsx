import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GitMerge, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { PanelHeader } from "./panel-shell";

type Ex = {
  id: string;
  nome_pt: string;
  padrao_movimento: string | null;
  metodologias: Methodology[] | null;
  unilateral: boolean | null;
  coach_id: string | null;
};

type Group = { key: string; label: string; items: Ex[] };

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function FusaoPanel() {
  const qc = useQueryClient();
  const [keepers, setKeepers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Group | null>(null);
  const [merging, setMerging] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["exercises", "duplicates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, nome_pt, padrao_movimento, metodologias, unilateral, coach_id")
        .order("nome_pt");
      if (error) throw error;
      return data as Ex[];
    },
  });

  const groups = useMemo<Group[]>(() => {
    if (!data) return [];
    const map = new Map<string, Ex[]>();
    for (const ex of data) {
      const key = normalize(ex.nome_pt);
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(ex);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({ key, label: items[0].nome_pt, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [data]);

  async function doMerge(group: Group) {
    const keeperId = keepers[group.key] ?? group.items[0].id;
    const duplicates = group.items.filter((i) => i.id !== keeperId).map((i) => i.id);
    if (duplicates.length === 0) return;
    setMerging(true);
    try {
      const { error } = await supabase.rpc("merge_exercises", {
        _keeper_id: keeperId,
        _duplicate_ids: duplicates,
      });
      if (error) throw error;
      toast.success(`${duplicates.length} duplicado(s) fundido(s)`);
      qc.invalidateQueries({ queryKey: ["exercises"] });
      setPending(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao fundir");
    } finally {
      setMerging(false);
    }
  }

  return (
    <section>
      <PanelHeader
        icon={GitMerge}
        title="Fusão de exercícios"
        description="Duplicados detectados por semelhança de nome. Escolha qual manter — as referências em sessões migram automaticamente antes da exclusão."
        aside={
          groups.length > 0 ? (
            <Badge variant="secondary" className="font-normal tabular-nums">
              {groups.length} grupo(s)
            </Badge>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="text-base font-semibold">Nenhum duplicado encontrado</div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Seu banco está limpo. Volte aqui sempre que importar exercícios em lote.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {groups.reduce((s, g) => s + g.items.length - 1, 0)} exercício(s) podem ser fundidos.
          </p>
          {groups.map((g) => {
            const keeperId = keepers[g.key] ?? g.items[0].id;
            return (
              <Card key={g.key} className="overflow-hidden p-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 bg-muted/40 px-4 py-3 md:px-5">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="truncate font-semibold">{g.label}</div>
                    <Badge variant="secondary" className="shrink-0 font-normal">
                      {g.items.length} entradas
                    </Badge>
                  </div>
                  <Button size="sm" onClick={() => setPending(g)} className="shrink-0 gap-2">
                    <GitMerge className="h-4 w-4" />
                    Fundir
                  </Button>
                </div>
                <RadioGroup
                  value={keeperId}
                  onValueChange={(v) => setKeepers((p) => ({ ...p, [g.key]: v }))}
                  className="divide-y divide-border/70 gap-0"
                >
                  {g.items.map((ex) => (
                    <label
                      key={ex.id}
                      htmlFor={`dup-${ex.id}`}
                      className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent/25 md:px-5"
                    >
                      <RadioGroupItem value={ex.id} id={`dup-${ex.id}`} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{ex.nome_pt}</span>
                          {keeperId === ex.id && (
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                              manter
                            </Badge>
                          )}
                          {!ex.coach_id && (
                            <Badge variant="outline" className="text-xs">
                              global
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {ex.padrao_movimento && (
                            <Badge variant="outline" className="text-xs">
                              {ex.padrao_movimento}
                            </Badge>
                          )}
                          {(ex.metodologias ?? []).map((m) => (
                            <Badge key={m} variant="secondary" className="text-xs">
                              {METHODOLOGY_LABEL[m]}
                            </Badge>
                          ))}
                          {ex.unilateral && (
                            <Badge variant="outline" className="text-xs">
                              unilateral
                            </Badge>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar fusão</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && (
                <>
                  <span className="font-medium text-foreground">
                    {pending.items.length - 1} exercício(s)
                  </span>{" "}
                  serão removidos e todas as referências em sessões migrarão para o exercício
                  marcado como "manter". Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={merging}
              onClick={(e) => {
                e.preventDefault();
                if (pending) doMerge(pending);
              }}
            >
              {merging ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fundindo…</>
              ) : (
                "Fundir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
