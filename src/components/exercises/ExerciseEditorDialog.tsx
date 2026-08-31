import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { METHODOLOGY_LABEL, type Methodology } from "@/lib/methodology";
import { ExerciseMediaUpload, type MediaItem } from "@/components/ExerciseMediaUpload";
import { DuplicateResolverDialog } from "./DuplicateResolverDialog";

export const EQUIPAMENTOS = [
  "Kettlebell",
  "Ginásticos",
  "Mobilidade",
  "Barbell",
  "Dumbbell",
  "Alternativos Musculação",
  "Objetos Alternativos",
] as const;

export type Equipamento = (typeof EQUIPAMENTOS)[number];

const METHODS = Object.keys(METHODOLOGY_LABEL) as Methodology[];

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function ExerciseEditorDialog({
  open,
  onOpenChange,
  editing,
  coachId,
  existingExercises,
  onOpenExisting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any | null;
  coachId: string | undefined;
  existingExercises: any[];
  onOpenExisting: (ex: any) => void;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [padrao, setPadrao] = useState("");
  const [metods, setMetods] = useState<Methodology[]>([]);
  const [equip, setEquip] = useState<Equipamento | "">("");
  const [unilateral, setUnilateral] = useState(false);
  const [instr, setInstr] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<any[] | null>(null);

  const isEdit = !!editing;

  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome_pt ?? "");
    setPadrao(editing?.padrao_movimento ?? "");
    setMetods(editing?.metodologias ?? []);
    setEquip(((editing?.equipamento ?? [])[0] as Equipamento) ?? "");
    setUnilateral(editing?.unilateral ?? false);
    setInstr(editing?.instrucoes ?? "");
    setMedia(
      (editing?.exercise_media ?? []).map((m: any) => ({
        ...m,
        tipo: m.storage_path?.startsWith("youtube-") ? "youtube" : m.tipo,
      }))
    );
    setDuplicates(null);
  }, [open, editing]);

  function findDuplicatesFor(name: string): any[] {
    const target = normalizeName(name);
    if (!target) return [];
    return existingExercises.filter((ex) => {
      if (editing?.id && ex.id === editing.id) return false;
      return normalizeName(ex.nome_pt ?? "") === target;
    });
  }

  async function persist(): Promise<string | null> {
    if (!coachId) {
      const m = "Perfil de treinador não encontrado";
      toast.error(m);
      return m;
    }
    setSaving(true);
    try {
      let exerciseId = editing?.id;
      if (isEdit) {
        const { error } = await supabase
          .from("exercises")
          .update({
            nome_pt: nome,
            padrao_movimento: padrao || null,
            metodologias: metods,
            equipamento: equip ? [equip] : [],
            unilateral,
            instrucoes: instr || null,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("exercises")
          .insert({
            coach_id: coachId,
            nome_pt: nome,
            padrao_movimento: padrao || null,
            metodologias: metods,
            equipamento: equip ? [equip] : [],
            unilateral,
            instrucoes: instr || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        exerciseId = data.id;
      }

      // Persistir mídias
      if (exerciseId) {
        await supabase.from("exercise_media").delete().eq("exercise_id", exerciseId);
        
        if (media.length > 0) {
          const { error: mediaError } = await supabase.from("exercise_media").insert(
            media.map((m) => ({
              exercise_id: exerciseId,
              storage_path: m.storage_path,
              url_publica: m.url_publica,
              tipo: m.tipo === "youtube" ? "video" : m.tipo,
            }))
          );
          if (mediaError) throw mediaError;
        }
      }

      toast.success(
        isEdit
          ? "Exercício atualizado com sucesso"
          : "Exercício criado com sucesso"
      );
      qc.invalidateQueries({ queryKey: ["exercises"] });
      onOpenChange(false);
      return null;
    } catch (e: any) {
      const raw: string = e?.message ?? "Falha ao salvar";
      const isRls =
        e?.code === "42501" ||
        /row-level security|row level security/i.test(raw);
      const friendly = isRls
        ? "Erro de permissão ao salvar. Verifique se o nome não está em conflito."
        : raw;
      if (!duplicates) toast.error(friendly);
      return friendly;
    } finally {
      setSaving(false);
    }
  }

  function save() {
    const dups = findDuplicatesFor(nome);
    if (dups.length > 0) {
      setDuplicates(dups);
      return;
    }
    void persist();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar exercício" : "Novo exercício"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome (PT)</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label>Padrão de movimento</Label>
              <Input
                placeholder="hinge, squat, push, pull, core..."
                value={padrao}
                onChange={(e) => setPadrao(e.target.value)}
              />
            </div>
            <div>
              <Label>Equipamento</Label>
              <Select
                value={equip || "nenhum"}
                onValueChange={(v) => setEquip(v === "nenhum" ? "" : (v as Equipamento))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem equipamento</SelectItem>
                  {EQUIPAMENTOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modalidades</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={metods.includes(m)}
                      onCheckedChange={(v) => {
                        setMetods((prev) =>
                          v ? [...prev, m] : prev.filter((x) => x !== m)
                        );
                      }}
                    />
                    {METHODOLOGY_LABEL[m]}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={unilateral}
                onCheckedChange={(v) => setUnilateral(Boolean(v))}
              />
              Exercício unilateral
            </label>
            <div>
              <Label>Instruções</Label>
              <Textarea rows={3} value={instr} onChange={(e) => setInstr(e.target.value)} />
            </div>
            <div className="pt-2">
              <Label className="mb-2 block">Mídia (Fotos, Vídeos, YouTube)</Label>
              <ExerciseMediaUpload 
                exerciseId={editing?.id}
                initialMedia={media}
                onMediaChange={setMedia}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving || !nome.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DuplicateResolverDialog
        open={!!duplicates}
        onOpenChange={(v) => !v && setDuplicates(null)}
        typedName={nome}
        onRename={(newName) => {
          setNome(newName);
          const dups = findDuplicatesFor(newName);
          if (dups.length === 0) setDuplicates(null);
          else setDuplicates(dups);
        }}
        candidates={duplicates ?? []}
        isEdit={isEdit}
        editingId={editing?.id}
        coachId={coachId}
        persist={persist}
        onPersisted={() => setDuplicates(null)}
        onKeep={(existing) => {
          setDuplicates(null);
          onOpenChange(false);
          onOpenExisting(existing);
        }}
        onMerged={() => {
          setDuplicates(null);
          qc.invalidateQueries({ queryKey: ["exercises"] });
          onOpenChange(false);
        }}
      />
    </>
  );
}
