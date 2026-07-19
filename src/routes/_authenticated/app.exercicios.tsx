import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Trash2, Pencil, Upload, GitMerge } from "lucide-react";
import { toast } from "sonner";
import {
  METHODOLOGY_LABEL,
  type Methodology,
} from "@/lib/methodology";
import { useCoach } from "@/hooks/use-coach";

export const Route = createFileRoute("/_authenticated/app/exercicios")({
  component: ExerciciosPage,
});

const METHODS = Object.keys(METHODOLOGY_LABEL) as Methodology[];

function ExerciciosPage() {
  const { data: coach } = useCoach();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [metFilter, setMetFilter] = useState<Methodology | "todos">("todos");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises", q, metFilter],
    queryFn: async () => {
      let query = supabase.from("exercises").select("*").order("nome_pt");
      if (q) query = query.ilike("nome_pt", `%${q}%`);
      if (metFilter !== "todos") query = query.contains("metodologias", [metFilter]);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exercício removido");
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banco de Exercícios</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre exercícios com mídia para usar no construtor de sessão.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/app/exercicios/duplicados" })}
          >
            <GitMerge className="mr-2 h-4 w-4" /> Duplicados
          </Button>
          <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo exercício
        </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={metFilter} onValueChange={(v) => setMetFilter(v as any)}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as metodologias</SelectItem>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {METHODOLOGY_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {exercises.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Nenhum exercício ainda. Clique em "Novo exercício" para começar.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {exercises.map((ex: any) => (
            <Card key={ex.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(ex);
                    setOpen(true);
                  }}
                  className="rounded-sm text-left font-semibold text-foreground outline-none transition-colors duration-150 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {ex.nome_pt}
                </button>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(ex.metodologias ?? []).map((m: Methodology) => (
                    <Badge key={m} variant="secondary" className="text-xs">
                      {METHODOLOGY_LABEL[m]}
                    </Badge>
                  ))}
                  {ex.padrao_movimento && (
                    <Badge variant="outline" className="text-xs">
                      {ex.padrao_movimento}
                    </Badge>
                  )}
                  {ex.unilateral && (
                    <Badge variant="outline" className="text-xs">
                      unilateral
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(ex);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Remover "${ex.nome_pt}"?`)) del.mutate(ex.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ExerciseDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        coachId={coach?.id}
      />
    </div>
  );
}

function ExerciseDialog({
  open,
  onOpenChange,
  editing,
  coachId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any | null;
  coachId: string | undefined;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [padrao, setPadrao] = useState("");
  const [metods, setMetods] = useState<Methodology[]>([]);
  const [unilateral, setUnilateral] = useState(false);
  const [instr, setInstr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = !!editing;

  // Populate form whenever the dialog opens (or the target exercise changes).
  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome_pt ?? "");
    setPadrao(editing?.padrao_movimento ?? "");
    setMetods(editing?.metodologias ?? []);
    setUnilateral(editing?.unilateral ?? false);
    setInstr(editing?.instrucoes ?? "");
    setFile(null);
  }, [open, editing]);

  async function save() {
    if (!coachId) return toast.error("Perfil de treinador não encontrado");
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
            unilateral,
            instrucoes: instr || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        exerciseId = data.id;
      }

      if (file && exerciseId) {
        const path = `${coachId}/${exerciseId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("exercise-media")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const tipo = file.type.startsWith("video")
          ? "video"
          : file.type.includes("gif")
            ? "gif"
            : "imagem";
        await supabase.from("exercise_media").insert({
          exercise_id: exerciseId,
          tipo,
          storage_path: path,
        });
      }

      toast.success(isEdit ? "Exercício atualizado" : "Exercício criado");
      qc.invalidateQueries({ queryKey: ["exercises"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
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
            <Label>Metodologias</Label>
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
          <div>
            <Label>Mídia (vídeo, imagem ou gif)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="file"
                accept="video/*,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || !nome}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}