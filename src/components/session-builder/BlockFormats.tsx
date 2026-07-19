import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ExercisePicker } from "./ExercisePicker";
import { useBuilder, type BuilderBlock } from "@/lib/session-builder-store";

function BlockExercises({ block }: { block: BuilderBlock }) {
  const addExercise = useBuilder((s) => s.addExercise);
  const removeExercise = useBuilder((s) => s.removeExercise);
  const updateExercise = useBuilder((s) => s.updateExercise);

  return (
    <div className="mt-4 space-y-2">
      {block.exercises.map((e) => (
        <div key={e.tempId} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
          <div className="flex-1 text-sm font-medium">
            {e.nome_livre ?? "Exercício"}
          </div>
          <Input
            className="h-8 w-20"
            placeholder="reps"
            value={e.reps ?? ""}
            onChange={(ev) => updateExercise(block.tempId, e.tempId, { reps: ev.target.value })}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => removeExercise(block.tempId, e.tempId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <ExercisePicker
        onPick={(ex) =>
          addExercise(block.tempId, {
            exercise_id: ex.id,
            nome_livre: ex.nome_pt,
          })
        }
      />
    </div>
  );
}

/* ---------- Preparação de Movimento ---------- */
export function PrepMovimentoForm({ block }: { block: BuilderBlock }) {
  const update = useBuilder((s) => s.updateBlock);
  const cfg = block.config;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Rounds</Label>
          <Input
            type="number"
            value={cfg.rounds ?? 4}
            onChange={(e) =>
              update(block.tempId, {
                config: { ...cfg, rounds: Number(e.target.value) },
              })
            }
          />
        </div>
        <div>
          <Label>Duração por round (min)</Label>
          <Input
            type="number"
            value={cfg.round_min ?? 5}
            onChange={(e) =>
              update(block.tempId, {
                config: { ...cfg, round_min: Number(e.target.value) },
              })
            }
          />
        </div>
      </div>
      <BlockExercises block={block} />
    </div>
  );
}

/* ---------- E2MOM / EMOM / AMRAP ---------- */
export function TimedForm({ block }: { block: BuilderBlock }) {
  const update = useBuilder((s) => s.updateBlock);
  const cfg = block.config;
  const isAmrap = block.formato === "amrap";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {isAmrap ? (
          <div>
            <Label>Duração total (min)</Label>
            <Input
              type="number"
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
              <Label>Rounds</Label>
              <Input
                type="number"
                value={cfg.rounds ?? 8}
                onChange={(e) =>
                  update(block.tempId, {
                    config: { ...cfg, rounds: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div>
              <Label>Intervalo (min)</Label>
              <Input
                type="number"
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