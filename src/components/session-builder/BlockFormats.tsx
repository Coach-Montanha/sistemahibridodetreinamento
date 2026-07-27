import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Flame, Wind } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ExercisePicker } from "./ExercisePicker";
import { useBuilder, type BuilderBlock } from "@/lib/session-builder-store";
import { SetsEditor } from "./SetsEditor";
import { SortableList, SortableRow } from "@/components/dnd/sortable-list";

function BlockExercises({
  block,
  slot,
  modo,
}: {
  block: BuilderBlock;
  slot?: "mobilidade" | "aquecimento";
  modo?: "circuito" | "series_fixas";
}) {
  const addExercise = useBuilder((s) => s.addExercise);
  const removeExercise = useBuilder((s) => s.removeExercise);
  const updateExercise = useBuilder((s) => s.updateExercise);
  const reorderExercises = useBuilder((s) => s.reorderExercises);
  void modo;
  const lista = slot
    ? block.exercises.filter((e) => (e.slot ?? "aquecimento") === slot)
    : block.exercises;
  const isMobilidade = slot === "mobilidade";

  return (
    <div className="mt-3 space-y-2">
      <SortableList
        ids={lista.map((e) => e.tempId)}
        label="Exercício"
        onReorder={(a, o) => reorderExercises(block.tempId, a, o)}
      >
        <div className="space-y-2">
          {lista.map((e) => (
            <SortableRow
              key={e.tempId}
              id={e.tempId}
              handleLabel={`Reordenar ${e.nome_livre ?? "exercício"}`}
              className="flex-col items-stretch bg-background/60 p-2 pl-1.5"
            >
              <div className="group flex w-full items-center gap-2">
                <div className="min-w-0 flex-1 truncate text-sm font-medium leading-6 text-foreground">
                  {e.nome_livre ?? "Exercício"}
                </div>
            {isMobilidade && (
              <div className="relative">
                <Input
                  inputMode="numeric"
                  className="h-8 w-24 pr-9 text-center tabular-nums transition-colors"
                  placeholder="tempo"
                  aria-label="Tempo de mobilidade em segundos"
                  value={e.reps ?? ""}
                  onChange={(ev) =>
                    updateExercise(block.tempId, e.tempId, { reps: ev.target.value })
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  seg
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              onClick={() => removeExercise(block.tempId, e.tempId)}
              aria-label="Remover exercício"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
              </div>
              {!isMobilidade && (
                <div className="w-full">
                  <SetsEditor block={block} exercise={e} />
                </div>
              )}
            </SortableRow>
          ))}
        </div>
      </SortableList>
      <ExercisePicker
        onPick={(ex) =>
          addExercise(block.tempId, {
            exercise_id: ex.id,
            nome_livre: ex.nome_pt,
            slot: slot ?? null,
          })
        }
      />
    </div>
  );
}

function ModoToggle({ block }: { block: BuilderBlock }) {
  const update = useBuilder((s) => s.updateBlock);
  const modo = (block.config?.modo_execucao as any) ?? "circuito";
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Execução
      </Label>
      <ToggleGroup
        type="single"
        size="sm"
        value={modo}
        onValueChange={(v) => {
          if (!v) return;
          update(block.tempId, { config: { ...block.config, modo_execucao: v } });
        }}
        className="rounded-md border border-border/60 bg-muted/30 p-0.5"
      >
        <ToggleGroupItem
          value="circuito"
          className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          Circuito
        </ToggleGroupItem>
        <ToggleGroupItem
          value="series_fixas"
          className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          Séries fixas
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

/* ---------- Preparação de Movimento ---------- */
export function PrepMovimentoForm({ block }: { block: BuilderBlock }) {
  const update = useBuilder((s) => s.updateBlock);
  const cfg = block.config;
  return (
    <div className="space-y-4">
      <SlotSection
        icon={<Wind className="h-3.5 w-3.5" />}
        label="Mobilidade"
        hint="movimentos articulares, respiração, ativação leve"
      >
        <BlockExercises block={block} slot="mobilidade" />
      </SlotSection>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-sm">
          <div>
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rounds</Label>
            <Input
              type="number"
              min={0}
              value={cfg.rounds ?? 4}
              onChange={(e) =>
                update(block.tempId, {
                  config: { ...cfg, rounds: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Minutos</Label>
            <Input
              type="number"
              min={0}
              value={cfg.round_min ?? 5}
              onChange={(e) =>
                update(block.tempId, {
                  config: { ...cfg, round_min: Number(e.target.value) },
                })
              }
            />
          </div>
        </div>
        <ModoToggle block={block} />
      </div>

      <SlotSection
        icon={<Flame className="h-3.5 w-3.5" />}
        label="Aquecimento"
        hint="progressão para a intensidade da sessão"
      >
        <BlockExercises block={block} slot="aquecimento" />
      </SlotSection>
    </div>
  );
}

function SlotSection({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {label}
          </div>
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------- E2MOM / EMOM / AMRAP ---------- */
export function TimedForm({ block }: { block: BuilderBlock }) {
  const update = useBuilder((s) => s.updateBlock);
  const cfg = block.config;
  const isAmrap = block.formato === "amrap";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-sm">
        {isAmrap ? (
          <div>
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duração total (min)</Label>
            <Input
              type="number"
              min={0}
              value={cfg.duracao_min ?? 12}
              onChange={(e) =>
                update(block.tempId, {
                  config: { ...cfg, duracao_min: Number(e.target.value) },
                  duracao_min: Number(e.target.value),
                })
              }
            />
          </div>
        ) : (
          <>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rounds</Label>
              <Input
                type="number"
                min={0}
                value={cfg.rounds ?? 8}
                onChange={(e) =>
                  update(block.tempId, {
                    config: { ...cfg, rounds: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Intervalo (min)</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={cfg.intervalo_min ?? (block.formato === "e2mom" ? 2 : 1)}
                onChange={(e) =>
                  update(block.tempId, {
                    config: { ...cfg, intervalo_min: Number(e.target.value) },
                  })
                }
              />
            </div>
          </>
        )}
        </div>
        <ModoToggle block={block} />
      </div>
      {isAmrap && (
        <p className="text-[11px] text-muted-foreground">
          Dica: use <span className="font-medium text-foreground">0</span> em séries ou reps para sinalizar "sem limite".
        </p>
      )}
      <BlockExercises block={block} />
    </div>
  );
}

/* ---------- Força/Técnica %1RM ---------- */
export function ForcaPctForm({ block }: { block: BuilderBlock }) {
  const update = useBuilder((s) => s.updateBlock);
  const passos: any[] = block.config.passos ?? [];

  function setPassos(next: any[]) {
    update(block.tempId, { config: { ...block.config, passos: next } });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Passos (% × séries × reps)</Label>
        {passos.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="number"
              className="w-20"
              value={p.pct}
              onChange={(e) => {
                const next = [...passos];
                next[i] = { ...p, pct: Number(e.target.value) };
                setPassos(next);
              }}
            />
            <span className="text-sm text-muted-foreground">% ·</span>
            <Input
              type="number"
              className="w-16"
              value={p.sets}
              onChange={(e) => {
                const next = [...passos];
                next[i] = { ...p, sets: Number(e.target.value) };
                setPassos(next);
              }}
            />
            <span className="text-sm text-muted-foreground">séries ·</span>
            <Input
              type="number"
              className="w-16"
              value={p.reps}
              onChange={(e) => {
                const next = [...passos];
                next[i] = { ...p, reps: Number(e.target.value) };
                setPassos(next);
              }}
            />
            <span className="text-sm text-muted-foreground">reps</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPassos(passos.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPassos([...passos, { pct: 70, sets: 1, reps: 3 }])}
        >
          Adicionar passo
        </Button>
      </div>
      <div className="mt-4">
        <Label className="mb-2 block">Complex (movimentos deste bloco)</Label>
        <BlockExercises block={block} />
      </div>
    </div>
  );
}

/* ---------- Kettlebell Sport AQ/TR ---------- */
export function KbTimedForm({ block }: { block: BuilderBlock }) {
  const update = useBuilder((s) => s.updateBlock);
  const cfg = block.config;

  function updateSet(kind: "aquecimento" | "tiro", idx: number, patch: any) {
    const arr = [...(cfg[kind] ?? [])];
    arr[idx] = { ...arr[idx], ...patch };
    update(block.tempId, { config: { ...cfg, [kind]: arr } });
  }
  function addSet(kind: "aquecimento" | "tiro") {
    const arr = [...(cfg[kind] ?? []), { sets: 1, work_min: 2, rest_min: 2 }];
    update(block.tempId, { config: { ...cfg, [kind]: arr } });
  }
  function removeSet(kind: "aquecimento" | "tiro", idx: number) {
    const arr = (cfg[kind] ?? []).filter((_: any, i: number) => i !== idx);
    update(block.tempId, { config: { ...cfg, [kind]: arr } });
  }

  return (
    <div className="space-y-4">
      {(["aquecimento", "tiro"] as const).map((kind) => (
        <div key={kind}>
          <Label className="uppercase tracking-wide">{kind === "aquecimento" ? "AQ · Aquecimento" : "TR · Tiro"}</Label>
          <div className="mt-2 space-y-2">
            {(cfg[kind] ?? []).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-16"
                  value={s.sets}
                  onChange={(e) => updateSet(kind, i, { sets: Number(e.target.value) })}
                />
                <span className="text-sm text-muted-foreground">× </span>
                <Input
                  type="number"
                  step="0.5"
                  className="w-16"
                  value={s.work_min}
                  onChange={(e) => updateSet(kind, i, { work_min: Number(e.target.value) })}
                />
                <span className="text-sm text-muted-foreground">min work · rest</span>
                <Input
                  type="number"
                  step="0.5"
                  className="w-16"
                  value={s.rest_min}
                  onChange={(e) => updateSet(kind, i, { rest_min: Number(e.target.value) })}
                />
                <span className="text-sm text-muted-foreground">min</span>
                <Button variant="ghost" size="icon" onClick={() => removeSet(kind, i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addSet(kind)}>
              Adicionar linha
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Label className="mb-2 block">Movimento clássico</Label>
        <BlockExercises block={block} />
      </div>
    </div>
  );
}