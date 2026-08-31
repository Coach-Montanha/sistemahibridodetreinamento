import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Trash2, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormatPreset } from "@/lib/format-registry";
import type { SetTypePreset } from "@/lib/set-type-registry";
import { BLOCK_FORMAT_LABEL, ENABLED_FORMATS } from "@/lib/methodology";

export function DefaultField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: any;
  onChange: (v: number | null) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          onChange(v);
        }}
        className="h-8 text-xs tabular-nums"
      />
    </div>
  );
}

export function DeleteFormatDialog({
  preset,
  onCancel,
  onConfirm,
}: {
  preset: FormatPreset | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = !!preset;
  const isBuiltin = !!preset?.builtin;
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBuiltin ? "Ocultar bloco padrão?" : "Excluir bloco personalizado?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {isBuiltin ? (
              <>
                <span className="font-medium text-foreground">{preset?.label}</span> vai
                sair do grid e do menu do construtor. Você pode restaurá-lo depois em
                "Blocos ocultos".
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">{preset?.label}</span> será
                removido permanentemente. Essa ação não pode ser desfeita.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              !isBuiltin &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {isBuiltin ? "Ocultar" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FormatoEditorDialog({
  open,
  preset,
  onOpenChange,
  onSave,
  onDelete,
  setTypes,
}: {
  open: boolean;
  preset: FormatPreset | null;
  onOpenChange: (v: boolean) => void;
  onSave: (next: FormatPreset) => void;
  onDelete?: (id: string) => void;
  setTypes: SetTypePreset[];
}) {
  const [draft, setDraft] = useState<FormatPreset | null>(null);

  useEffect(() => {
    if (open && preset) setDraft({ ...preset, defaults: { ...(preset.defaults ?? {}) } });
    if (!open) setDraft(null);
  }, [open, preset]);

  if (!draft) return null;
  const isNew = !draft.builtin && !draft.id;
  const defaults = draft.defaults ?? {};

  const setDefault = (key: string, v: number | string | null) => {
    setDraft((d) => (d ? { ...d, defaults: { ...(d.defaults ?? {}), [key]: v } } : d));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {isNew ? "Novo formato" : draft.builtin ? "Editar formato padrão" : "Editar preset"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Aplica ao construtor manual e às preferências do gerador automático.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nome</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder={BLOCK_FORMAT_LABEL[draft.base] || draft.base}
              className="h-10"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mecânica da Série (Tipo)
              </Label>
              <Select
                value={draft.set_type_id}
                onValueChange={(v) => {
                  const newSetType = setTypes.find((t) => t.id === v);
                  setDraft({ 
                    ...draft, 
                    set_type_id: v,
                    enabled_fields: newSetType?.fields.map((f) => f.key),
                  });
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {setTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estrutura do bloco
              </Label>
              <Select
                value={draft.base}
                onValueChange={(v) => setDraft({ ...draft, base: v })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENABLED_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {BLOCK_FORMAT_LABEL[f] || f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Campos visíveis e Rótulos
            </Label>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="grid grid-cols-1 gap-3">
                {setTypes
                  .find((t) => t.id === draft.set_type_id)
                  ?.fields.map((field) => {
                    const isEnabled = draft.enabled_fields?.includes(field.key) ?? true;
                    const customLabel = draft.field_labels?.[field.key] || field.label;
                    
                    return (
                      <div key={field.key} className="flex items-center gap-3">
                        <Checkbox 
                          id={`field-${field.key}`}
                          checked={isEnabled}
                          onCheckedChange={(checked) => {
                            const currentFields =
                              draft.enabled_fields ||
                              setTypes.find((t) => t.id === draft.set_type_id)?.fields.map((f) => f.key) ||
                              [];
                            const nextFields = checked 
                              ? [...currentFields, field.key]
                              : currentFields.filter((k) => k !== field.key);
                            setDraft({ ...draft, enabled_fields: nextFields });
                          }}
                        />
                        <div className="flex-1 grid grid-cols-2 gap-2 items-center">
                          <Label htmlFor={`field-${field.key}`} className="text-xs cursor-pointer">
                            {field.label}
                          </Label>
                          <Input 
                            size={1}
                            className="h-7 text-[11px]"
                            placeholder={field.label}
                            value={customLabel}
                            onChange={(e) => {
                              setDraft({
                                ...draft,
                                field_labels: {
                                  ...(draft.field_labels || {}),
                                  [field.key]: e.target.value,
                                },
                              });
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Descrição
              <span className="ml-1 normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
            </Label>
            <Textarea
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Ex.: AMRAP curto para finalizar a sessão"
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Valores padrão
            </Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DefaultField
                label="Rounds"
                value={defaults.rounds}
                onChange={(v) => setDefault("rounds", v)}
              />
              <DefaultField
                label="Duração (min)"
                value={defaults.duracao_min}
                onChange={(v) => setDefault("duracao_min", v)}
              />
              <DefaultField
                label="Intervalo (min)"
                value={defaults.intervalo_min}
                step="0.5"
                onChange={(v) => setDefault("intervalo_min", v)}
              />
              <DefaultField
                label="Reps por ex."
                value={defaults.reps}
                onChange={(v) => setDefault("reps", v)}
              />
              <DefaultField
                label="Tempo (seg)"
                value={defaults.tempo_seg}
                onChange={(v) => setDefault("tempo_seg", v)}
              />
              <DefaultField
                label="Estações"
                value={defaults.estacoes}
                onChange={(v) => setDefault("estacoes", v)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Deixe em branco para usar o valor do bloco. Só campos aplicáveis ao formato serão usados.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-border/60 px-6 py-4">
          <div className="flex items-center gap-2">
            {!draft.builtin && draft.id && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onDelete(draft.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir formato
              </Button>
            )}
            {draft.builtin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onDelete!(draft.id);
                  onOpenChange(false);
                }}
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Desativar formato
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => onSave(draft)} disabled={!draft.label.trim()}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
