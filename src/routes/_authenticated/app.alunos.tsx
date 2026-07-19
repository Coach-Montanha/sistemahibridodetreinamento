import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Copy, X } from "lucide-react";
import {
  inviteStudent,
  deleteStudent,
  assignSessionToStudent,
  assignProgramToStudent,
  unassign,
} from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/app/alunos")({
  component: AlunosPage,
});

function AlunosPage() {
  const qc = useQueryClient();
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, nome, email, telefone, status, auth_user_id, criado_em")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = students.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alunos</h1>
          <p className="text-sm text-muted-foreground">
            Convide alunos e libere programas/sessões para eles.
          </p>
        </div>
        <InviteButton onDone={() => qc.invalidateQueries({ queryKey: ["students"] })} />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : students.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Nenhum aluno ainda. Convide o primeiro.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-2">
            {students.map((s) => (
              <Card
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`cursor-pointer p-3 transition ${
                  selectedId === s.id ? "border-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.email}</div>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {s.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
          {selected ? (
            <StudentPanel key={selected.id} student={selected} onDeleted={() => setSelectedId(null)} />
          ) : (
            <Card className="flex items-center justify-center p-12 text-muted-foreground">
              Selecione um aluno
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function InviteButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [result, setResult] = useState<{ email: string; tempPassword: string | null } | null>(null);
  const invite = useServerFn(inviteStudent);
  const m = useMutation({
    mutationFn: async () => invite({ data: { nome, email, telefone } }),
    onSuccess: (r) => {
      onDone();
      setResult({ email, tempPassword: r.tempPassword });
      if (r.alreadyExisted) toast.info("Usuário já existia; vinculado ao seu perfil.");
      else toast.success("Aluno convidado!");
      setNome("");
      setEmail("");
      setTelefone("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setResult(null); }}>
      <DialogTrigger asChild>
        <Button><UserPlus className="mr-2 h-4 w-4" /> Convidar aluno</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Convidar aluno</DialogTitle></DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="text-sm">
              Envie estas credenciais para o aluno:
            </p>
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <div><b>E-mail:</b> {result.email}</div>
              {result.tempPassword ? (
                <div className="mt-1 flex items-center gap-2">
                  <span><b>Senha:</b> <code>{result.tempPassword}</code></span>
                  <Button size="sm" variant="ghost" onClick={() => {
                    navigator.clipboard.writeText(result.tempPassword!);
                    toast.success("Copiado");
                  }}><Copy className="h-3 w-3" /></Button>
                </div>
              ) : (
                <div className="mt-1 text-muted-foreground">
                  Este e-mail já tinha conta. Peça para o aluno entrar com a senha existente.
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Guarde agora — não mostraremos novamente.
            </p>
            <DialogFooter>
              <Button onClick={() => { setOpen(false); setResult(null); }}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); m.mutate(); }}
            className="space-y-3"
          >
            <div>
              <Label>Nome</Label>
              <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Telefone (opcional)</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={m.isPending}>
                {m.isPending ? "Convidando..." : "Convidar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StudentPanel({ student, onDeleted }: { student: any; onDeleted: () => void }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteStudent);
  const assignS = useServerFn(assignSessionToStudent);
  const assignP = useServerFn(assignProgramToStudent);
  const unassignFn = useServerFn(unassign);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, titulo, metodologia")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, titulo, numero_dia, data, program_week_id, program_weeks(program_id, programs(titulo))")
        .order("criado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, session_id, program_id, program_week_id, liberado_em, sessions(titulo), programs(titulo)")
        .eq("student_id", student.id)
        .order("liberado_em", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const [pickProgram, setPickProgram] = useState<string>("");
  const [pickSession, setPickSession] = useState<string>("");

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{student.nome}</div>
          <div className="text-sm text-muted-foreground">{student.email}</div>
          {student.telefone && <div className="text-sm text-muted-foreground">{student.telefone}</div>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!confirm("Remover este aluno?")) return;
            await del({ data: { id: student.id } });
            qc.invalidateQueries({ queryKey: ["students"] });
            onDeleted();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Liberar programa inteiro</Label>
          <div className="flex gap-2">
            <Select value={pickProgram} onValueChange={setPickProgram}>
              <SelectTrigger><SelectValue placeholder="Escolha um programa" /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!pickProgram}
              onClick={async () => {
                try {
                  await assignP({ data: { student_id: student.id, program_id: pickProgram } });
                  toast.success("Programa liberado");
                  setPickProgram("");
                  qc.invalidateQueries({ queryKey: ["assignments", student.id] });
                } catch (e: any) { toast.error(e.message); }
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Liberar
            </Button>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Liberar sessão avulsa</Label>
          <div className="flex gap-2">
            <Select value={pickSession} onValueChange={setPickSession}>
              <SelectTrigger><SelectValue placeholder="Escolha uma sessão" /></SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.program_weeks?.programs?.titulo ?? "Sessão"} · Dia {s.numero_dia} {s.titulo ? `— ${s.titulo}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!pickSession}
              onClick={async () => {
                try {
                  await assignS({ data: { student_id: student.id, session_id: pickSession } });
                  toast.success("Sessão liberada");
                  setPickSession("");
                  qc.invalidateQueries({ queryKey: ["assignments", student.id] });
                } catch (e: any) { toast.error(e.message); }
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Liberar
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Liberado ({assignments.length})</div>
          {assignments.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nada liberado ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <div>
                    {a.program_id ? `📚 Programa: ${a.programs?.titulo ?? "—"}` : null}
                    {a.session_id ? `🏋️ Sessão: ${a.sessions?.titulo ?? "—"}` : null}
                    {a.program_week_id ? `📅 Semana` : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await unassignFn({ data: { id: a.id } });
                      qc.invalidateQueries({ queryKey: ["assignments", student.id] });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}