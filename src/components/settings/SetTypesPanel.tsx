import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Wrench, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSetTypeRegistry,
  type SetFieldKey,
  type SetTypePreset,
} from "@/lib/set-type-registry";

export const FIELD_OPTIONS: { key: SetFieldKey; label: string }[] = [
  { key: "serie_rep", label: "Série/Rep" },
  { key: "carga", label: "Carga (kg)" },
  { key: "tempo_seg", label: "Tempo (s)" },
  { key: "intervalo_seg", label: "Intervalo (s)" },
  { key: "inclinacao_pct", label: "Inclinação (%)" },
  { key: "distancia", label: "Distância" },
  { key: "ritmo", label: "Ritmo" },
  { key: "cadencia", label: "Cadência" },
  { key: "obs", label: "Observações" },
];

export function SetTypesPanel() {
  const { presets, addCustom, updateCustom, removePreset } = useSetTypeRegistry();
  const [editing, setEditing] = useState<SetTypePreset | null>(null);

  function handleSave(next: SetTypePreset) {
    if (!next.id) {
      addCustom({ label: next.label, fields: next.fields });
    } else {
      updateCustom(next.id, { label: next.label, fields: next.fields });
    }
    setEditing(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Tipos de séries
          </h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Crie novos tipos de séries (Ex: Repetições e Potência) definindo quais campos o treinador deve preencher.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setEditing({ id: "", label: "", fields: [{ key: "serie_rep", label: "Série/rep" }] })}
        >
          <Plus className="h-4 w-4" /> Novo tipo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => (
          <Card key={p.id} className="relative overflow-hidden border-border/60 bg-card p-4 transition-all hover:border-primary/40">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{p.label}</h3>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.fields.map((f) => (
                    <Badge key={f.key} variant="outline" className="text-[10px] uppercase tracking-wide">
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)}>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removePreset(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {p.builtin && (
              <Badge variant="secondary" className="absolute right-2 top-2 h-5 text-[9px] uppercase tracking-tighter opacity-40">
                Padrão
              </Badge>
            )}
          </Card>
        ))}
      </div>

      {editing && (
        <SetTypeEditorDialog
          preset={editing}
          onSave={handleSave}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

export function SetTypeEditorDialog({
  preset,
  onSave,
  onOpenChange,
}: {
  preset: SetTypePreset;
  onSave: (next: SetTypePreset) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<SetTypePreset>(preset);

  function toggleField(key: SetFieldKey) {
    const exists = draft.fields.find((f) => f.key === key);
    if (exists) {
      setDraft({ ...draft, fields: draft.fields.filter((f) => f.key !== key) });
    } else {
      const option = FIELD_OPTIONS.find((o) => o.key === key)!;
      setDraft({ ...draft, fields: [...draft.fields, { key, label: option.label }] });
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{preset.id ? "Editar tipo" : "Novo tipo de série"}</DialogTitle>
          <DialogDescription>
            Escolha as colunas que estarão disponíveis para este tipo de série.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label>Nome do tipo</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Ex: Repetições e Potência"
            />
          </div>

          <div className="space-y-2">
            <Label>Colunas disponíveis</Label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_OPTIONS.map((opt) => {
                const active = draft.fields.some((f) => f.key === opt.key);
                return (
                  <Button
                    key={opt.key}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className="h-9 justify-start text-xs"
                    onClick={() => toggleField(opt.key)}
                  >
                    <Check className={cn("mr-2 h-3 w-3 opacity-0 transition-opacity", active && "opacity-100")} />
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(draft)} disabled={!draft.label.trim() || draft.fields.length === 0}>
            Salvar tipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
