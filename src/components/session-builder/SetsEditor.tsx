import { useState } from "react";
import { Copy, Plus, Save, Trash2, Bookmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  useBuilder,
  type BuilderBlock,
  type BuilderExercise,
  type BuilderSet,
  type SetType,
} from "@/lib/session-builder-store";
import {
  materializePreset,
  useSetPresets,
  type SetPreset,
} from "@/lib/exercise-set-presets";

import { useSetTypeRegistry, type SetFieldKey } from "@/lib/set-type-registry";

function useSetTypeInfo(typeId: string) {
  const { presets } = useSetTypeRegistry();
  return presets.find((p: any) => p.id === typeId) || presets[0];
}


export function SetsEditor({
  block,
  exercise,
}: {
  block: BuilderBlock;
  exercise: BuilderExercise;
}) {
  const addSet = useBuilder((s) => s.addSet);
  const updateSet = useBuilder((s) => s.updateSet);
  const removeSet = useBuilder((s) => s.removeSet);
  const replicateLastSet = useBuilder((s) => s.replicateLastSet);
  const setExerciseSets = useBuilder((s) => s.setExerciseSets);

  const { presets, save: savePreset, remove: removePreset } = useSetPresets();
  const sets = exercise.sets ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const lastType = sets.at(-1)?.tipo ?? "reps_carga";

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors">
      {sets.length === 0 ? (
        <p className="mb-3 text-[12px] text-muted-foreground">
          Nenhuma série adicionada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {sets.map((s, idx) => (
            <SetRow
              key={s.id}
              index={idx}
              set={s}
              onChange={(patch) => updateSet(block.tempId, exercise.tempId, s.id, patch)}
              onRemove={() => removeSet(block.tempId, exercise.tempId, s.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              className="h-9 flex-1 gap-1.5 sm:flex-none"
            >
              <Plus className="h-4 w-4" /> Adicionar série
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(92vw,380px)] p-4">
            <AddSetForm
              defaultType={lastType}
              onSubmit={(draft) => {
                addSet(block.tempId, exercise.tempId, draft);
                setAddOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          variant="outline"
          className="h-9 flex-1 gap-1.5 sm:flex-none"
          onClick={() => {
            if (!sets.length) return toast.error("Adicione uma série primeiro.");
            replicateLastSet(block.tempId, exercise.tempId);
          }}
          disabled={!sets.length}
        >
          <Copy className="h-4 w-4" /> Replicar séries
        </Button>

        <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-9 flex-1 gap-1.5 sm:flex-none"
            >
              <Bookmark className="h-4 w-4" /> Adicionar preset
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(92vw,340px)] p-2">
            <PresetList
              presets={presets}
              onPick={(p) => {
                setExerciseSets(block.tempId, exercise.tempId, [
                  ...sets,
                  ...materializePreset(p),
                ]);
                setPresetsOpen(false);
                toast.success(`Preset "${p.name}" aplicado`);
              }}
              onDelete={(p) => {
                removePreset(p.id);
                toast.success(`Preset "${p.name}" removido`);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-2 flex justify-center">
        <Popover open={saveOpen} onOpenChange={setSaveOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
              disabled={!sets.length}
            >
              <Save className="h-3.5 w-3.5" /> Salvar como preset
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-[min(92vw,320px)] p-3">
            <Label htmlFor="preset-name" className="text-xs uppercase tracking-wide text-muted-foreground">
              Nome do preset
            </Label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="preset-name"
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Ex: Pirâmide 3x"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveName.trim()) {
                    savePreset(saveName, sets);
                    toast.success("Preset salvo");
                    setSaveName("");
                    setSaveOpen(false);
                  }
                }}
              />
              <Button
                size="icon"
                className="h-9 w-9"
                disabled={!saveName.trim()}
                onClick={() => {
                  savePreset(saveName, sets);
                  toast.success("Preset salvo");
                  setSaveName("");
                  setSaveOpen(false);
                }}
                aria-label="Salvar preset"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function SetRow({
  index,
  set,
  onChange,
  onRemove,
}: {
  index: number;
  set: BuilderSet;
  onChange: (patch: Partial<BuilderSet>) => void;
  onRemove: () => void;
}) {
  const { presets } = useSetTypeRegistry();
  const info = presets.find(p => p.id === set.tipo) || presets[0];
  const fields = info.fields;

  return (
    <div className="group grid grid-cols-[1fr_auto] items-end gap-2 rounded-md border border-border/60 bg-background/70 p-2 transition-colors hover:border-border">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <FieldLabel>Tipo · #{index + 1}</FieldLabel>
          <Select
            value={set.tipo}
            onValueChange={(v) => onChange({ tipo: v as SetType })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {fields.map((f) => (
          <div key={f.key} className={f.wide ? "col-span-2 sm:col-span-3" : ""}>
            <FieldLabel>{f.label}</FieldLabel>
            <Input
              className="h-9 text-center text-sm tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring/60"
              placeholder={f.placeholder}
              value={(set[f.key] as string | undefined) ?? ""}
              aria-label={`${f.label} da série ${index + 1}`}
              onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<BuilderSet>)}
            />
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Remover série ${index + 1}`}
        className="h-9 w-9 self-end text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function AddSetForm({
  defaultType,
  onSubmit,
}: {
  defaultType: SetType;
  onSubmit: (draft: Partial<BuilderSet>) => void;
}) {
  const { presets } = useSetTypeRegistry();
  const [tipo, setTipo] = useState<SetType>(defaultType);
  const [values, setValues] = useState<Record<string, string>>({});
  const fields = presets.find((p: any) => p.id === tipo)?.fields || presets[0].fields;


  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Selecione o tipo da série</FieldLabel>
        <Select
          value={tipo}
          onValueChange={(v) => {
            setTipo(v as SetType);
            setValues({});
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={`grid gap-2 ${fields.length > 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {fields.map((f) => (
          <div key={f.key} className={f.wide ? "col-span-2" : ""}>
            <FieldLabel>{f.label}</FieldLabel>
            <Input
              className="h-9 text-center text-sm tabular-nums"
              placeholder={f.placeholder}
              value={values[f.key as string] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [f.key as string]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>
      <Button
        className="h-9 w-full"
        onClick={() => onSubmit({ tipo, ...values })}
      >
        Adicionar
      </Button>
    </div>
  );
}

function PresetList({
  presets,
  onPick,
  onDelete,
}: {
  presets: SetPreset[];
  onPick: (p: SetPreset) => void;
  onDelete: (p: SetPreset) => void;
}) {
  if (!presets.length) {
    return (
      <p className="p-3 text-center text-xs text-muted-foreground">
        Nenhum preset salvo ainda.
      </p>
    );
  }
  return (
    <ul className="max-h-72 space-y-1 overflow-auto">
      {presets.map((p) => (
        <li
          key={p.id}
          className="group flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent"
        >
          <button
            type="button"
            onClick={() => onPick(p)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {p.sets.length} {p.sets.length === 1 ? "série" : "séries"} ·{" "}
              {presets.find((t: any) => t.id === (p.sets[0]?.tipo))?.label || "Desconhecido"}
            </div>
          </button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(p);
            }}
            aria-label={`Remover preset ${p.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}