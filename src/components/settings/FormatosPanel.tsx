import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  Copy,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormatPreset } from "@/lib/format-registry";
import { useFormatRegistry } from "@/lib/format-registry";
import { useSetTypeRegistry } from "@/lib/set-type-registry";
import { BLOCK_FORMAT_LABEL } from "@/lib/methodology";
import { FormatoEditorDialog, DeleteFormatDialog } from "./FormatoEditorDialog";

export function FormatosPanel() {
  const {
    builtins,
    presets,
    saveBuiltin,
    resetBuiltin,
    toggleBuiltin,
    addCustom,
    updateCustom,
    removePreset,
    duplicatePreset,
    reorderPresets,
  } = useFormatRegistry();
  const { presets: setTypes } = useSetTypeRegistry();

  const [editing, setEditing] = useState<FormatPreset | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<FormatPreset | null>(null);

  const hiddenBuiltins = builtins.filter((p) => !presets.find((pr) => pr.id === p.id));
  const activeCount = presets.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorderPresets(String(active.id), String(over.id));
  }

  function confirmedDelete() {
    if (!confirmDelete) return;
    removePreset(confirmDelete.id);
    setConfirmDelete(null);
  }

  function openNew() {
    setEditing({
      id: "",
      label: "",
      base: "bodybuilding_sets",
      set_type_id: "reps_carga",
      description: "",
      defaults: { series: 4, reps: "8-12", descanso_seg: 60 },
      builtin: false,
    });
  }

  function handleSave(next: FormatPreset) {
    if (next.builtin) {
      saveBuiltin(next.id, {
        label: next.label,
        base: next.base,
        set_type_id: next.set_type_id,
        description: next.description,
        defaults: next.defaults,
        enabled_fields: next.enabled_fields,
        field_labels: next.field_labels,
      });
    } else if (next.id) {
      updateCustom(next.id, {
        label: next.label,
        base: next.base,
        set_type_id: next.set_type_id,
        description: next.description,
        defaults: next.defaults,
        enabled_fields: next.enabled_fields,
        field_labels: next.field_labels,
      });
    } else {
      addCustom({
        label: next.label,
        base: next.base,
        set_type_id: next.set_type_id,
        description: next.description,
        defaults: next.defaults,
        enabled_fields: next.enabled_fields,
        field_labels: next.field_labels,
      });
    }
    setEditing(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Formatos de bloco
          </h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Edite, oculte ou crie variações dos blocos que aparecem no construtor manual
            e nas preferências de geração automática.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-6 gap-1 rounded-full px-2.5 text-[11px] font-medium">
            <Sparkles className="h-3 w-3" /> {activeCount} ativos
          </Badge>
          {hiddenBuiltins.length > 0 && (
            <Badge variant="outline" className="h-6 gap-1 rounded-full px-2.5 text-[11px] font-medium">
              <EyeOff className="h-3 w-3" /> {hiddenBuiltins.length} ocultos
            </Badge>
          )}
          <Button size="sm" className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo formato
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={presets.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {presets.map((p) => (
                <FormatoCard
                  key={p.id}
                  preset={p}
                  customized={false}
                  onEdit={() => setEditing(p)}
                  onDuplicate={async () => {
                    const id = await duplicatePreset(p);
                    const newPreset = presets.find((pr) => pr.id === id);
                    if (newPreset) setEditing(newPreset);
                  }}
                  onReset={p.builtin ? () => resetBuiltin(p.base) : undefined}
                  onDelete={() => setConfirmDelete(p)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {activeCount === 0 && (
          <Card className="flex flex-col items-center justify-center gap-2 border-dashed py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">Nenhum formato ativo</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Todos os formatos estão ocultos. Reative um abaixo ou crie um novo.
            </p>
          </Card>
        )}
      </section>

      {hiddenBuiltins.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="group flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            {showHidden ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Blocos ocultos ({hiddenBuiltins.length})
          </button>
          {showHidden && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {hiddenBuiltins.map((p) => (
                <FormatoCard
                  key={p.id}
                  preset={p}
                  hidden
                  customized={false}
                  onEdit={() => setEditing(p)}
                  onShow={() => toggleBuiltin(p.base, true)}
                  onReset={() => resetBuiltin(p.base)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <FormatoEditorDialog
        open={!!editing}
        preset={editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSave={handleSave}
        onDelete={(id) => {
          const p = presets.find((x) => x.id === id) || builtins.find((x) => x.id === id);
          if (p) setConfirmDelete(p);
        }}
        setTypes={setTypes}
      />

      <DeleteFormatDialog
        preset={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmedDelete}
      />
    </div>
  );
}

export function FormatoCard({
  preset,
  hidden,
  customized,
  onEdit,
  onDuplicate,
  onShow,
  onReset,
  onDelete,
}: {
  preset: FormatPreset;
  hidden?: boolean;
  customized?: boolean;
  onEdit: () => void;
  onDuplicate?: () => void;
  onShow?: () => void;
  onReset?: () => void;
  onDelete?: () => void;
}) {
  const defaults = preset.defaults ?? {};
  const chips: { label: string; value: string }[] = [];
  if (defaults.rounds) chips.push({ label: "Rounds", value: String(defaults.rounds) });
  if (defaults.duracao_min) chips.push({ label: "Min", value: String(defaults.duracao_min) });
  if (defaults.intervalo_min) chips.push({ label: "Int", value: `${defaults.intervalo_min}′` });
  if (defaults.reps) chips.push({ label: "Reps", value: String(defaults.reps) });
  if (defaults.tempo_seg) chips.push({ label: "Tempo", value: `${defaults.tempo_seg}s` });
  if (defaults.estacoes) chips.push({ label: "Estações", value: String(defaults.estacoes) });

  const sortable = useSortable({ id: preset.id, disabled: hidden });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;
  const style = hidden
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  return (
    <Card
      ref={hidden ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border-border/60 bg-card/60 p-5 backdrop-blur transition-all duration-200",
        "hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_8px_24px_-12px_hsl(var(--primary)/0.25)]",
        hidden && "opacity-70",
        isDragging && "z-10 scale-[1.02] shadow-lg ring-1 ring-primary/40",
      )}
    >
      {!hidden && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-all duration-150 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 md:opacity-0 touch-none cursor-grab active:cursor-grabbing"
          aria-label={`Arrastar para reordenar ${preset.label}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            preset.builtin ? "bg-primary/10 text-primary" : "bg-accent/40 text-accent-foreground",
          )}
        >
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {preset.label}
            </h3>
            {!preset.builtin && (
              <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[10px] font-medium">
                Preset
              </Badge>
            )}
            {customized && preset.builtin && (
              <Badge variant="outline" className="h-5 gap-1 rounded-full border-primary/40 px-1.5 text-[10px] font-medium text-primary">
                <Wand2 className="h-2.5 w-2.5" /> editado
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {BLOCK_FORMAT_LABEL[preset.base]}
          </p>
          {preset.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {preset.description}
            </p>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              <span className="text-[9px] uppercase tracking-wider opacity-70">{c.label}</span>
              <span className="tabular-nums text-foreground">{c.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-1 pt-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <div className="flex items-center gap-0.5">
          {onDuplicate && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground transition-colors hover:text-foreground"
              onClick={onDuplicate}
              aria-label="Duplicar"
              title="Duplicar como preset"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {customized && onReset && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground transition-colors hover:text-foreground"
              onClick={onReset}
              aria-label="Restaurar padrão"
              title="Restaurar padrão"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          {onShow && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={onShow}
              aria-label="Restaurar"
              title="Restaurar no grid"
            >
              <Eye className="h-3.5 w-3.5" /> Restaurar
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 transition-colors",
                preset.builtin
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              )}
              onClick={onDelete}
              aria-label={preset.builtin ? "Ocultar" : "Excluir"}
              title={preset.builtin ? "Ocultar do menu" : "Excluir preset"}
            >
              {preset.builtin ? <EyeOff className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
