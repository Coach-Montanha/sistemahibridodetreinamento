import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Dumbbell,
  Flame,
  FolderKanban,
  PlusSquare,
  Settings,
  Sparkles,
  Users,
  Wand2,
  Calculator,
  Timer,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { useCoach } from "@/hooks/use-coach";
import { OneRepMaxDialog } from "@/components/calculators/OneRepMaxDialog";
import { WorkoutTimerDialog } from "@/components/timers/WorkoutTimerDialog";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: coach } = useCoach();
  const [rmOpen, setRmOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);

  const stats = useQuery({
    queryKey: ["dashboard-stats", coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const [ex, prog, stu, ses] = await Promise.all([
        supabase.from("exercises").select("id", { count: "exact", head: true }),
        supabase.from("programs").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id", { count: "exact", head: true }),
      ]);
      return {
        exercises: ex.count ?? 0,
        programs: prog.count ?? 0,
        students: stu.count ?? 0,
        sessions: ses.count ?? 0,
      };
    },
  });

  const { data: studentsAtRisk = [] } = useQuery({
    queryKey: ["students-retention", coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, nome, email, telefone, status, criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((s) => s.status === "convidado" || s.status === "inativo");
    },
  });

  return (
    <div className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-4 sm:space-y-8 sm:px-6 sm:py-8">
      {/* Header do Treinador */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            Sistema Híbrido Ativo
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl break-words">
            Olá, {coach?.nome ?? "Treinador"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Prescrição atlética, periodização contínua e gestão de atletas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer border-border/80 hover:bg-muted/80 min-h-[36px] gap-1.5"
            onClick={() => setTimerOpen(true)}
          >
            <Timer className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">Timer Treino</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer border-border/80 hover:bg-muted/80 min-h-[36px] gap-1.5"
            onClick={() => setRmOpen(true)}
          >
            <Calculator className="h-4 w-4 text-sky-500" />
            <span className="hidden sm:inline">Calculadora 1RM</span>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="cursor-pointer border-border/80 hover:bg-muted/80 min-h-[36px]"
          >
            <Link to="/app/configuracoes">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              Configurações
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero Bento: Ações de Alto Impacto */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Card 1: Motor IA */}
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-4 sm:p-6 shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <Badge variant="secondary" className="font-semibold text-xs text-primary bg-primary/15 border-none">
              IA Prescritiva
            </Badge>
          </div>

          <h2 className="mt-4 sm:mt-5 text-lg sm:text-xl font-bold tracking-tight">Gerador de Treinos com IA</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Prescreva sessões em blocos mecânicos com progressão ondulatória e consulta automática ao seu banco de dados.
          </p>

          <Button
            asChild
            className="mt-5 sm:mt-6 w-full cursor-pointer min-h-[44px] font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200"
          >
            <Link to="/app/treinos" search={{ aba: "gerar", ia: true }}>
              <Wand2 className="mr-2 h-4 w-4" />
              Gerar Sessão com IA
            </Link>
          </Button>
        </Card>

        {/* Card 2: Construtor Manual */}
        <Card className="relative overflow-hidden border-border/80 bg-card p-4 sm:p-6 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground">
              <PlusSquare className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Manual & Modular
            </Badge>
          </div>

          <h2 className="mt-4 sm:mt-5 text-lg sm:text-xl font-bold tracking-tight">Montar Sessão por Blocos</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Arraste e solte exercícios com formatos EMOM, AMRAP, Circuitos e RFT personalizados para cada nível.
          </p>

          <Button
            asChild
            variant="outline"
            className="mt-5 sm:mt-6 w-full cursor-pointer min-h-[44px] font-semibold border-border/80 hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
          >
            <Link to="/app/sessoes/nova">
              <ArrowRight className="mr-2 h-4 w-4 text-primary" />
              Abrir Construtor de Sessão
            </Link>
          </Button>
        </Card>
      </div>

      {/* Painel de Retenção e Alertas de Alunos */}
      {studentsAtRisk.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/[0.04] p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-600">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Monitor de Retenção ({studentsAtRisk.length} atleta{studentsAtRisk.length === 1 ? "" : "s"} requer{studentsAtRisk.length === 1 ? "e" : "em"} atenção)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Atletas convidados ou inativos com pendências de adesão às planilhas.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs gap-1 self-start sm:self-auto cursor-pointer">
              <Link to="/app/alunos">Ver todos os alunos <ChevronRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          <div className="mt-2 divide-y divide-border/50">
            {studentsAtRisk.slice(0, 3).map((s) => {
              const cleanPhone = (s.telefone || "").replace(/\D/g, "");
              const msg = `Fala ${s.nome}! Coach Montanha passando para saber como estão os treinos e o seu ritmo essa semana. Vamos juntos retomar o planejamento?`;
              const waUrl = cleanPhone
                ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
                : null;

              return (
                <div key={s.id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm truncate text-foreground">{s.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                        {s.status}
                      </Badge>
                      {s.telefone && (
                        <span className="text-[11px] text-muted-foreground truncate">{s.telefone}</span>
                      )}
                    </div>
                  </div>

                  {waUrl ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 hover:border-emerald-500/50 cursor-pointer shrink-0"
                    >
                      <a href={waUrl} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-3.5 w-3.5" /> Resgatar
                      </a>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="ghost" className="h-8 text-xs shrink-0 cursor-pointer">
                      <Link to="/app/alunos">Ver perfil</Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Bento Grid: Métricas Atléticas (KPIs) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Visão Geral do Sistema
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {/* Exercícios */}
          <Link to="/app/exercicios" className="group cursor-pointer">
            <Card className="p-3.5 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words line-clamp-2 min-w-0 leading-tight">
                  Exercícios
                </span>
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate">
                {stats.data?.exercises ?? "…"}
              </div>
              <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">Vídeos e mecânicas cadastradas</p>
            </Card>
          </Link>

          {/* Programas */}
          <Link to="/app/treinos" search={{ aba: "programas", ia: false }} className="group cursor-pointer">
            <Card className="p-3.5 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words line-clamp-2 min-w-0 leading-tight">
                  Programas
                </span>
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                  <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate">
                {stats.data?.programs ?? "…"}
              </div>
              <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">Planilhas e periodizações</p>
            </Card>
          </Link>

          {/* Sessões */}
          <Link to="/app/treinos" className="group cursor-pointer">
            <Card className="p-3.5 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words line-clamp-2 min-w-0 leading-tight">
                  Sessões
                </span>
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                  <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate">
                {stats.data?.sessions ?? "…"}
              </div>
              <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">Treinos registrados</p>
            </Card>
          </Link>

          {/* Alunos */}
          <Link to="/app/alunos" className="group cursor-pointer">
            <Card className="p-3.5 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground break-words line-clamp-2 min-w-0 leading-tight">
                  Atletas & Alunos
                </span>
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums truncate">
                {stats.data?.students ?? "…"}
              </div>
              <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">Alunos ativos</p>
            </Card>
          </Link>
        </div>
      </div>

      {/* Seção de Navegação Rápida */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Acesso Rápido
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            asChild
            variant="outline"
            className="h-auto cursor-pointer justify-between p-4 border-border/70 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 min-h-[44px]"
          >
            <Link to="/app/treinos">
              <div className="flex items-center gap-3 text-left">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-primary">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Hub de Treinos</div>
                  <div className="text-xs text-muted-foreground">Gerenciar sessões</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto cursor-pointer justify-between p-4 border-border/70 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 min-h-[44px]"
          >
            <Link to="/app/exercicios">
              <div className="flex items-center gap-3 text-left">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-primary">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Banco de Exercícios</div>
                  <div className="text-xs text-muted-foreground">Consultar mídias</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto cursor-pointer justify-between p-4 border-border/70 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 min-h-[44px]"
          >
            <Link to="/app/alunos">
              <div className="flex items-center gap-3 text-left">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Gestão de Alunos</div>
                  <div className="text-xs text-muted-foreground">Vincular programas</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto cursor-pointer justify-between p-4 border-border/70 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 min-h-[44px]"
          >
            <Link to="/app/configuracoes">
              <div className="flex items-center gap-3 text-left">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-primary">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Aparência & Temas</div>
                  <div className="text-xs text-muted-foreground">Personalizar UI</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Dialogs de Ferramentas */}
      <OneRepMaxDialog open={rmOpen} onOpenChange={setRmOpen} />
      <WorkoutTimerDialog open={timerOpen} onOpenChange={setTimerOpen} />
    </div>
  );
}