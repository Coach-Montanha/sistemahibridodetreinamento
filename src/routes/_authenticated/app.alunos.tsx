import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Timeline,
  TimelineItem,
  TimelinePoint,
  TimelineContent,
  TimelineTitle,
  TimelineTime,
  TimelineDescription,
} from "@/components/ui/timeline";
import { KanbanBoard, type KanbanColumn, type KanbanCardItem } from "@/components/ui/kanban";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Users, Copy, X, History, Dumbbell, BookOpen, Calendar, CheckCircle2, Columns3, List } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [athletePhases, setAthletePhases] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("athlete_kanban_phases");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const KANBAN_COLUMNS: KanbanColumn[] = [
    {
      id: "adaptacao",
      title: "Adaptação & Base",
      description: "Avaliação inicial e introdução",
      color: "bg-blue-500",
    },
    {
      id: "hipertrofia",
      title: "Hipertrofia / Volume",
      description: "Bloco acumulativo estrutural",
      color: "bg-emerald-500",
    },
    {
      id: "forca",
      title: "Força & Pico",
      description: "Intensificação e cargas máximas",
      color: "bg-amber-500",
    },
    {
      id: "deload",
      title: "Deload & Renovação",
      description: "Recuperação ativa e reteste",
      color: "bg-purple-500",
    },
  ];

  const kanbanItems = useMemo<KanbanCardItem[]>(() => {
    return students.map((s, idx) => {
      let colId = athletePhases[s.id];
      if (!colId) {
        if (s.status === "convidado") colId = "adaptacao";
        else {
          const defaultCols = ["adaptacao", "hipertrofia", "forca", "deload"];
          colId = defaultCols[idx % defaultCols.length];
        }
      }
      return {
        id: s.id,
        columnId: colId,
        title: s.nome,
        description: s.email || undefined,
        badge: s.status,
        badgeVariant: s.status === "ativo" ? "default" : "outline",
        tags: s.telefone ? [s.telefone] : undefined,
      };
    });
  }, [students, athletePhases]);

  const handleMoveAthlete = (studentId: string, _fromCol: string, toCol: string) => {
    setAthletePhases((prev) => {
      const next = { ...prev, [studentId]: toCol };
      try {
        localStorage.setItem("athlete_kanban_phases", JSON.stringify(next));
      } catch {}
      return next;
    });
    const colName = KANBAN_COLUMNS.find((c) => c.id === toCol)?.title || toCol;
    const student = students.find((s) => s.id === studentId);
    toast.success(`${student?.nome || "Aluno"} movido para "${colName}"`);
  };

  return (
    <div className="mx-auto max-w-6xl min-w-0 px-3 py-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl break-words">Alunos</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Convide alunos e libere programas/sessões para eles.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 gap-1.5 cursor-pointer"
              onClick={() => setViewMode("list")}
              title="Visualização em Lista"
            >
              <List className="h-4 w-4" />
              <span className="text-xs">Lista</span>
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 gap-1.5 cursor-pointer"
              onClick={() => setViewMode("kanban")}
              title="Visualização em Pipeline Kanban"
            >
              <Columns3 className="h-4 w-4" />
              <span className="text-xs">Kanban</span>
            </Button>
          </div>
          <InviteButton onDone={() => qc.invalidateQueries({ queryKey: ["students"] })} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
          <Card className="h-64 animate-pulse border-border/60 bg-muted/20" />
        </div>
      ) : students.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Nenhum aluno cadastrado ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Convide seus atletas para que eles acessem os treinos e acompanhem a execução pelo portal do aluno.
            </p>
          </div>
          <div className="mt-2">
            <InviteButton onDone={() => qc.invalidateQueries({ queryKey: ["students"] })} />
          </div>
        </Card>
      ) : viewMode === "kanban" ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>
              Arraste os cards para mover os atletas entre as fases de periodização. Clique em um aluno para abrir suas prescrições e evolução.
            </span>
          </div>
          <KanbanBoard
            columns={KANBAN_COLUMNS}
            items={kanbanItems}
            onItemMove={handleMoveAthlete}
            onCardClick={(item) => setSelectedId(item.id)}
          />
          {selected && (
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold tracking-tight">Painel do Atleta: {selected.nome}</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                  Fechar painel
                </Button>
              </div>
              <StudentPanel key={selected.id} student={selected} onDeleted={() => setSelectedId(null)} />
            </div>
          )}
        </div>
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
              Selecione um aluno para gerenciar programas e sessões atribuídas.
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

      <Tabs defaultValue="prescricoes" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="prescricoes">Prescrições & Treinos</TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Linha do Tempo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescricoes" className="space-y-4 focus-visible:outline-none">
          <div>
            <Label className="mb-2 block">Liberar programa inteiro</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={pickProgram} onValueChange={setPickProgram}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Escolha um programa" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!pickProgram}
                className="w-full sm:w-auto min-h-[40px] shrink-0 cursor-pointer"
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
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={pickSession} onValueChange={setPickSession}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Escolha uma sessão" /></SelectTrigger>
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
                className="w-full sm:w-auto min-h-[40px] shrink-0 cursor-pointer"
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
        </TabsContent>

        <TabsContent value="timeline" className="focus-visible:outline-none pt-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Jornada & Marcos do Atleta
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {assignments.length + 1} evento(s)
            </Badge>
          </div>

          <Timeline className="py-2">
            {/* Evento 1: Atribuições mais recentes primeiro */}
            {assignments.map((a) => (
              <TimelineItem key={a.id}>
                <TimelinePoint variant={a.program_id ? "primary" : "success"}>
                  {a.program_id ? <BookOpen className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
                </TimelinePoint>
                <TimelineContent>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <TimelineTitle>
                      {a.program_id ? "Programa Atribuído" : "Sessão Avulsa Prescrita"}
                    </TimelineTitle>
                    {a.liberado_em && (
                      <TimelineTime>
                        {new Date(a.liberado_em).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TimelineTime>
                    )}
                  </div>
                  <TimelineDescription>
                    {a.program_id ? (
                      <span><strong>{a.programs?.titulo ?? "Programa"}</strong> disponibilizado com periodização completa.</span>
                    ) : (
                      <span><strong>{a.sessions?.titulo ?? "Sessão"}</strong> liberada para execução imediata no app.</span>
                    )}
                  </TimelineDescription>
                </TimelineContent>
              </TimelineItem>
            ))}

            {/* Evento Inicial: Cadastro do Aluno */}
            <TimelineItem>
              <TimelinePoint variant="default">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </TimelinePoint>
              <TimelineContent>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <TimelineTitle>Entrada no Sistema Híbrido</TimelineTitle>
                  {student.criado_em && (
                    <TimelineTime>
                      {new Date(student.criado_em).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TimelineTime>
                  )}
                </div>
                <TimelineDescription>
                  Atleta cadastrado na assessoria do Coach Montanha com status{" "}
                  <strong className="text-foreground">{student.status ?? "ativo"}</strong>.
                </TimelineDescription>
              </TimelineContent>
            </TimelineItem>
          </Timeline>
        </TabsContent>
      </Tabs>
    </Card>
  );
}