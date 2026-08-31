import { useState, useEffect, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ListChecks, Search, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import {
  listEquipamentos,
  searchExercicios,
  getExerciciosByIds,
  type BlocoPref,
} from "@/lib/generator-prefs.functions";

export function CurationSection({
  bloco,
  onChange,
}: {
  bloco: BlocoPref;
  onChange: (b: BlocoPref) => void;
}) {
  const [open, setOpen] = useState(false);
  const permitidos = bloco.exercicios_permitidos ?? [];
  const ativo = permitidos.length > 0;

  const hidratados = useQuery({
    queryKey: ["curated-names", permitidos.slice().sort().join("|")],
    queryFn: () => getExerciciosByIds({ data: { ids: permitidos } }),
    enabled: ativo,
    staleTime: 30_000,
  });

  const nomes = hidratados.data ?? [];
  const preview = nomes.slice(0, 3);
  const resto = Math.max(0, permitidos.length - preview.length);

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4 transition-colors",
        ativo
          ? "border-primary/30 bg-primary/[0.03]"
          : "border-border/50 bg-muted/20",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            Pool de exercícios
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {ativo
              ? "O motor sorteia só dos exercícios curados abaixo — filtros de modalidade e equipamento ficam ignorados."
              : "Sem curadoria — o motor usa modalidade + equipamento do bloco."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ativo && (
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 font-medium tabular-nums text-primary"
            >
              {permitidos.length} curado{permitidos.length === 1 ? "" : "s"}
            </Badge>
          )}
          <Button
            type="button"
            variant={ativo ? "outline" : "default"}
            size="sm"
            className="gap-1.5"
            onClick={() => setOpen(true)}
          >
            <ListChecks className="h-3.5 w-3.5" />
            {ativo ? "Editar pool" : "Curar exercícios"}
          </Button>
        </div>
      </div>

      {ativo && (
        <div className="flex flex-wrap items-center gap-1.5">
          {hidratados.isLoading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando nomes…
            </span>
          ) : (
            <>
              {preview.map((ex) => (
                <Badge
                  key={ex.id}
                  variant="secondary"
                  className="max-w-[220px] truncate border-border/60 bg-background font-normal"
                  title={ex.nome_pt}
                >
                  {ex.nome_pt}
                </Badge>
              ))}
              {resto > 0 && (
                <Badge
                  variant="secondary"
                  className="border-border/60 bg-background font-normal tabular-nums text-muted-foreground"
                >
                  +{resto}
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onChange({ ...bloco, exercicios_permitidos: [] })}
              >
                <RotateCcw className="h-3 w-3" />
                Voltar ao automático
              </Button>
            </>
          )}
        </div>
      )}

      <CurationSheet
        open={open}
        onOpenChange={setOpen}
        selectedIds={permitidos}
        onSave={(ids) => onChange({ ...bloco, exercicios_permitidos: ids })}
      />
    </div>
  );
}

export function CurationSheet({
  open,
  onOpenChange,
  selectedIds,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  onSave: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [mods, setMods] = useState<Methodology[]>([]);
  const [equips, setEquips] = useState<string[]>([]);
  const [somenteMeus, setSomenteMeus] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    if (open) setDraft(new Set(selectedIds));
  }, [open, selectedIds]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const equipQuery = useQuery({
    queryKey: ["equipamentos"],
    queryFn: () => listEquipamentos(),
    staleTime: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ["curation-search", debouncedQ, mods.slice().sort().join("|"), equips.slice().sort().join("|"), somenteMeus],
    queryFn: () =>
      searchExercicios({
        data: {
          query: debouncedQ,
          modalidades: mods,
          equipamentos: equips,
          somente_meus: somenteMeus,
          limit: 300,
        },
      }),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const items = listQuery.data ?? [];
  const visibleIds = useMemo(() => items.map((x) => x.id), [items]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => draft.has(id));

  function toggle(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }
  function unselectAllVisible() {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) next.delete(id);
      return next;
    });
  }

  function commit() {
    onSave(Array.from(draft));
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            Curar pool de exercícios
          </SheetTitle>
          <SheetDescription className="text-xs">
            Escolha manualmente os exercícios que o motor pode sortear neste bloco.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 border-b border-border/60 bg-muted/20 px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome…"
              className="h-10 pl-9"
              aria-label="Buscar exercícios"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(METHODOLOGY_LABEL) as Methodology[]).map((m) => {
              const active = mods.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setMods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
                  }
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {METHODOLOGY_LABEL[m]}
                </button>
              );
            })}
          </div>

          {(equipQuery.data ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(equipQuery.data ?? []).map((eq) => {
                const active = equips.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() =>
                      setEquips((prev) =>
                        prev.includes(eq) ? prev.filter((x) => x !== eq) : [...prev, eq],
                      )
                    }
                    className={cn(
                      "inline-flex h-7 items-center rounded-full border px-2.5 text-xs capitalize transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={somenteMeus}
                onCheckedChange={(v) => setSomenteMeus(v === true)}
              />
              Somente meus exercícios
            </label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={allVisibleSelected ? unselectAllVisible : selectAllVisible}
                disabled={visibleIds.length === 0}
              >
                {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
              </Button>
              {draft.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setDraft(new Set())}
                >
                  Limpar seleção
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-3 py-2">
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium">Nenhum exercício encontrado</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Ajuste os filtros ou a busca.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {items.map((ex) => {
                  const checked = draft.has(ex.id);
                  return (
                    <li key={ex.id}>
                      <button
                        type="button"
                        onClick={() => toggle(ex.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          checked
                            ? "border-primary/40 bg-primary/10"
                            : "border-transparent bg-transparent hover:border-border/60 hover:bg-accent/40",
                        )}
                      >
                        <Checkbox checked={checked} className="pointer-events-none" tabIndex={-1} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{ex.nome_pt}</p>
                          {(ex.metodologias.length > 0 || ex.equipamento.length > 0) && (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {ex.metodologias.map((m) => METHODOLOGY_LABEL[m as Methodology] ?? m).join(" · ")}
                              {ex.metodologias.length > 0 && ex.equipamento.length > 0 ? " — " : ""}
                              {ex.equipamento.join(", ")}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <p className="text-xs tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{draft.size}</span> selecionado{draft.size === 1 ? "" : "s"}
            {items.length > 0 && (
              <span className="ml-1 text-muted-foreground/70">
                · {items.length} visíve{items.length === 1 ? "l" : "is"}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={commit} className="min-w-[100px]">
              Aplicar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
