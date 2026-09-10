import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Mountain,
  Wind,
  Flame,
  Play,
  Share2,
  FileDown,
  Calculator,
  Timer,
  CheckCircle2,
  Check,
  X,
  RotateCcw,
  PartyPopper,
  Sparkles,
  Loader2,
} from "lucide-react";
import { BLOCK_FORMAT_LABEL, type BlockFormat } from "@/lib/methodology";
import { formatSessionForWhatsApp, openWhatsAppShare } from "@/lib/whatsapp-share";
import { exportarSessoesPdfTabela } from "@/lib/pdf-treino";
import { OneRepMaxDialog } from "@/components/calculators/OneRepMaxDialog";
import { WorkoutTimerDialog } from "@/components/timers/WorkoutTimerDialog";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { soundEffects } from "@/lib/audio-beeps";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/aluno/sessao/$id")({
  component: SessaoAluno,
});

function SessaoAluno() {
  const { id } = Route.useParams();
  const [activeMedia, setActiveMedia] = useState<{
    nome: string;
    media: any[];
    videoUrl?: string;
  } | null>(null);

  // Estados de ferramentas auxiliares
  const [rmOpen, setRmOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Estado das séries concluídas pelo atleta (persistido por sessão)
  const [completedSets, setCompletedSets] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem(`session-${id}-sets`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Estado de treino concluído
  const [isFinished, setIsFinished] = useState(() => {
    try {
      return localStorage.getItem(`session-${id}-finished`) === "true";
    } catch {
      return false;
    }
  });

  // Cronômetro flutuante de descanso
  const [restTimer, setRestTimer] = useState<{
    totalSeconds: number;
    secondsLeft: number;
    exerciseName: string;
  } | null>(null);

  useEffect(() => {
    let timer: any = null;
    if (restTimer && restTimer.secondsLeft > 0) {
      timer = setInterval(() => {
        setRestTimer((prev) => {
          if (!prev) return null;
          if (prev.secondsLeft <= 1) {
            soundEffects.playRestCompleteBeep();
            toast.success(`Descanso concluído para ${prev.exerciseName}!`, {
              description: "Hora da próxima série!",
            });
            return null;
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [restTimer]);

  const { data: session } = useQuery({
    queryKey: ["aluno-sessao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, titulo, numero_dia, data, program_weeks(numero_semana, programs(titulo, metodologia))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ["aluno-blocks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_blocks")
        .select(
          "id, ordem, formato, titulo, duracao_min, config, session_block_exercises(id, ordem, reps, series, pct_1rm, carga_kg, descanso_seg, lado, observacoes, nome_livre, exercises(nome_pt, video_url, exercise_media(*)))",
        )
        .eq("session_id", id)
        .order("ordem");
      if (error) throw error;
      return data as any[];
    },
  });

  // Cálculo de progresso total de séries da sessão
  const { totalSets, completedSetsCount } = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const b of blocks) {
      for (const ex of b.session_block_exercises ?? []) {
        const s = Number(ex.series) || 0;
        if (s > 0) {
          total += s;
          const done = completedSets[ex.id]?.length || 0;
          completed += Math.min(done, s);
        }
      }
    }
    return { totalSets: total, completedSetsCount: completed };
  }, [blocks, completedSets]);

  const progressPct = totalSets > 0 ? Math.round((completedSetsCount / totalSets) * 100) : 0;

  const toggleSet = (exerciseId: string, setIndex: number, restSeconds?: number, exerciseName?: string) => {
    setCompletedSets((prev) => {
      const current = prev[exerciseId] || [];
      const isDone = current.includes(setIndex);
      const nextList = isDone ? current.filter((s) => s !== setIndex) : [...current, setIndex];
      const next = { ...prev, [exerciseId]: nextList };
      try {
        localStorage.setItem(`session-${id}-sets`, JSON.stringify(next));
      } catch {}

      // Se marcou como feita (não desmarcando), dispara o timer de descanso
      if (!isDone) {
        const dur = restSeconds && restSeconds > 0 ? restSeconds : 60;
        setRestTimer({
          totalSeconds: dur,
          secondsLeft: dur,
          exerciseName: exerciseName || "Exercício",
        });
        toast.info(`Descanso iniciado (${dur}s)`);
      }
      return next;
    });
  };

  const addRestTime = (sec: number) => {
    setRestTimer((prev) => {
      if (!prev) return null;
      const nextVal = Math.max(0, prev.secondsLeft + sec);
      return {
        ...prev,
        secondsLeft: nextVal,
        totalSeconds: Math.max(prev.totalSeconds, nextVal),
      };
    });
  };

  function handleShareWhatsApp() {
    if (!session) return;
    const shareData = {
      titulo: session.titulo ?? "Treino",
      data: session.data,
      metodologia: session.program_weeks?.programs?.metodologia,
      blocos: blocks.map((b) => ({
        titulo: b.titulo ?? "Bloco",
        formato: b.formato,
        exercicios: (b.session_block_exercises ?? []).map((e: any) => ({
          nome: e.exercises?.nome_pt ?? e.nome_livre ?? "Exercício",
          series: e.series,
          reps: e.reps,
          carga: e.carga_kg,
          descanso: e.descanso_seg,
        })),
      })),
    };
    const text = formatSessionForWhatsApp(shareData, window.location.href);
    openWhatsAppShare(text);
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await exportarSessoesPdfTabela([id], `${session?.titulo ?? "treino"}.pdf`);
      toast.success("Ficha do treino em PDF baixada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleFinishWorkout = () => {
    setIsFinished(true);
    try {
      localStorage.setItem(`session-${id}-finished`, "true");
    } catch {}
    toast.success("Parabéns, treino concluído!", {
      description: "Todas as séries e registros foram marcados como concluídos.",
    });
  };

  return (
    <div className="min-h-screen bg-background max-w-full overflow-x-hidden pb-24">
      {/* Header com Navegação e Ferramentas Rápidas */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5 gap-2">
          <Link
            to="/aluno"
            className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> Meus treinos
          </Link>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <InstallAppButton size="sm" className="h-8 px-2.5 text-xs" />

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1.5 text-xs cursor-pointer"
              onClick={() => setTimerOpen(true)}
              title="Cronômetro / Timer"
            >
              <Timer className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Timer</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1.5 text-xs cursor-pointer"
              onClick={() => setRmOpen(true)}
              title="Calculadora de 1RM"
            >
              <Calculator className="h-3.5 w-3.5 text-sky-500" />
              <span className="hidden sm:inline">1RM</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={downloadingPdf}
              className="h-8 px-2.5 gap-1.5 text-xs cursor-pointer"
              onClick={handleDownloadPdf}
              title="Baixar ficha em PDF"
            >
              {downloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5 text-rose-500" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:border-emerald-500/50 cursor-pointer"
              onClick={handleShareWhatsApp}
              title="Compartilhar no WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-3 py-4 sm:p-6 min-w-0">
        {session && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground break-words">
                  {session.program_weeks?.programs?.titulo} · Semana {session.program_weeks?.numero_semana} · Dia {session.numero_dia} · {session.data ?? ""}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold break-words">{session.titulo ?? "Treino"}</h1>
              </div>
              {isFinished && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 shrink-0">
                  <Check className="h-3 w-3" /> Treino Concluído
                </Badge>
              )}
            </div>

            {/* Barra de Progresso de Séries */}
            {totalSets > 0 && (
              <div className="rounded-xl border bg-card/60 p-3 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Progresso da Sessão
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {completedSetsCount} / {totalSets} séries ({progressPct}%)
                  </span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            )}
          </div>
        )}

        {blocks.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Sessão vazia.</Card>
        ) : (
          blocks.map((b) => {
            const slots: Record<string, string> = b.config?.slots ?? {};
            const exs = (b.session_block_exercises ?? []).slice().sort((a: any, z: any) => a.ordem - z.ordem);
            const hasSlots = b.formato === "preparacao_movimento" && Object.keys(slots).length > 0;
            const grupos = hasSlots
              ? [
                  { key: "mobilidade", label: "Mobilidade", icon: Wind, items: exs.filter((e: any) => slots[String(e.ordem)] === "mobilidade") },
                  { key: "aquecimento", label: "Aquecimento", icon: Flame, items: exs.filter((e: any) => (slots[String(e.ordem)] ?? "aquecimento") === "aquecimento") },
                ]
              : null;

            return (
              <Card key={b.id} className="p-3.5 sm:p-5">
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-primary font-semibold">
                    {BLOCK_FORMAT_LABEL[b.formato as BlockFormat] ?? b.formato}
                    {b.duracao_min ? ` · ${b.duracao_min} min` : ""}
                  </div>
                  <div className="text-lg font-semibold">{b.titulo ?? "Bloco"}</div>
                  {b.config?.instrucoes && (
                    <div className="mt-1 text-sm text-muted-foreground">{b.config.instrucoes}</div>
                  )}
                </div>

                {grupos ? (
                  <div className="space-y-4">
                    {grupos.map(({ key, label, icon: Icon, items }) => (
                      items.length > 0 && (
                        <div key={key} className="rounded-md border border-border/60 bg-muted/20 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
                          </div>
                          <ExerciseList
                            items={items}
                            completedSets={completedSets}
                            onToggleSet={toggleSet}
                            onOpenMedia={(m) => setActiveMedia(m)}
                          />
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <ExerciseList
                    items={exs}
                    completedSets={completedSets}
                    onToggleSet={toggleSet}
                    onOpenMedia={(m) => setActiveMedia(m)}
                  />
                )}
              </Card>
            );
          })
        )}

        {/* Botão Concluir Treino */}
        {blocks.length > 0 && (
          <div className="pt-2">
            {isFinished ? (
              <Card className="p-4 border-emerald-500/40 bg-emerald-500/10 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold">
                  <PartyPopper className="h-5 w-5" /> Treino Concluído com Sucesso!
                </div>
                <p className="text-xs text-muted-foreground">
                  Excelente consistência! Todas as suas séries foram salvas.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setIsFinished(false)}
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" /> Reabrir marcações
                </Button>
              </Card>
            ) : (
              <Button
                type="button"
                className="w-full h-12 text-base font-bold gap-2 cursor-pointer shadow-sm"
                onClick={handleFinishWorkout}
              >
                <CheckCircle2 className="h-5 w-5" /> Finalizar Treino de Hoje
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Floating Rest Timer Bar */}
      {restTimer && restTimer.secondsLeft > 0 && (
        <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card/95 p-3.5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary font-mono font-bold text-sm ring-1 ring-primary/30">
                {restTimer.secondsLeft}s
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  Descanso: {restTimer.exerciseName}
                </p>
                <div className="w-28 mt-1.5">
                  <Progress
                    value={((restTimer.totalSeconds - restTimer.secondsLeft) / restTimer.totalSeconds) * 100}
                    className="h-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => addRestTime(15)}
              >
                +15s
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => addRestTime(-15)}
              >
                -15s
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setRestTimer(null)}
                title="Fechar descanso"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog para visualização de mídias de demonstração do exercício */}
      {activeMedia && (
        <Dialog open={!!activeMedia} onOpenChange={(open) => !open && setActiveMedia(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{activeMedia.nome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {activeMedia.media && activeMedia.media.length > 0 ? (
                <div className="grid gap-3">
                  {activeMedia.media.map((item: any, idx: number) => {
                    if (item.tipo === "video") {
                      return (
                        <video
                          key={idx}
                          src={item.url_publica}
                          controls
                          className="w-full rounded-lg bg-black"
                        />
                      );
                    }
                    if (item.tipo === "youtube" || (item.url_publica && item.url_publica.includes("youtube.com"))) {
                      return (
                        <iframe
                          key={idx}
                          src={item.url_publica.replace("watch?v=", "embed/")}
                          title={activeMedia.nome}
                          className="aspect-video w-full rounded-lg"
                          allowFullScreen
                        />
                      );
                    }
                    return (
                      <img
                        key={idx}
                        src={item.url_publica}
                        alt={activeMedia.nome}
                        className="max-h-80 w-full rounded-lg object-contain bg-black/5 dark:bg-white/5"
                      />
                    );
                  })}
                </div>
              ) : activeMedia.videoUrl ? (
                <div className="aspect-video w-full overflow-hidden rounded-lg">
                  <iframe
                    src={activeMedia.videoUrl.replace("watch?v=", "embed/")}
                    title={activeMedia.nome}
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Nenhuma mídia disponível.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal da Calculadora de 1RM */}
      <OneRepMaxDialog open={rmOpen} onOpenChange={setRmOpen} />

      {/* Modal do Timer Especializado */}
      <WorkoutTimerDialog open={timerOpen} onOpenChange={setTimerOpen} />
    </div>
  );
}

function formatMetric(v: any, tpl: (x: string) => string): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v === 0 || v === "0") return tpl("sem limite");
  return tpl(String(v));
}

function ExerciseList({
  items,
  completedSets,
  onToggleSet,
  onOpenMedia,
}: {
  items: any[];
  completedSets: Record<string, number[]>;
  onToggleSet: (exerciseId: string, setIndex: number, restSeconds?: number, exerciseName?: string) => void;
  onOpenMedia: (data: { nome: string; media: any[]; videoUrl?: string }) => void;
}) {
  return (
    <div className="space-y-2.5">
      {items.map((ex) => {
        const exerciseName = ex.exercises?.nome_pt ?? ex.nome_livre ?? "Exercício";
        const mediaList = ex.exercises?.exercise_media ?? [];
        const hasMedia = mediaList.length > 0 || !!ex.exercises?.video_url;
        const totalSetsNum = Number(ex.series) || 0;

        const parts = [
          formatMetric(ex.series, (x) => (x === "sem limite" ? "séries livres" : `${x} séries`)),
          formatMetric(ex.reps, (x) => (x === "sem limite" ? "reps livres" : `${x} reps`)),
          ex.pct_1rm ? `${ex.pct_1rm}% 1RM` : null,
          ex.carga_kg ? `${ex.carga_kg} kg` : null,
          ex.descanso_seg ? `descanso ${ex.descanso_seg}s` : null,
        ].filter(Boolean);

        return (
          <div key={ex.id} className="rounded-lg border border-border/60 bg-card p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground text-sm">
                  {exerciseName}
                  {ex.lado ? ` · ${ex.lado}` : ""}
                </div>
                {parts.length > 0 && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{parts.join(" · ")}</div>
                )}
                {ex.observacoes && (
                  <div className="mt-1 text-[11px] text-muted-foreground/80">{ex.observacoes}</div>
                )}
              </div>
              {hasMedia && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 shrink-0 gap-1.5 text-xs text-primary hover:bg-primary/10 h-8 px-2.5 cursor-pointer"
                  onClick={() =>
                    onOpenMedia({
                      nome: exerciseName,
                      media: mediaList,
                      videoUrl: ex.exercises?.video_url,
                    })
                  }
                >
                  <Play className="h-3 w-3 fill-primary" />
                  <span className="hidden sm:inline">Execução</span>
                </Button>
              )}
            </div>

            {/* Checklist de Séries Interativo */}
            {totalSetsNum > 0 && (
              <div className="pt-1 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                  Séries:
                </span>
                {Array.from({ length: Math.min(totalSetsNum, 12) }).map((_, idx) => {
                  const setNum = idx + 1;
                  const isDone = completedSets[ex.id]?.includes(setNum);

                  return (
                    <button
                      key={setNum}
                      type="button"
                      onClick={() => onToggleSet(ex.id, setNum, ex.descanso_seg, exerciseName)}
                      className={cn(
                        "inline-flex h-7 min-w-[34px] px-2 items-center justify-center rounded-md text-xs font-bold transition-all duration-150 cursor-pointer",
                        isDone
                          ? "bg-emerald-500 text-white shadow-xs scale-102 ring-1 ring-emerald-600"
                          : "border border-border/80 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      {isDone ? <Check className="h-3 w-3 mr-0.5 stroke-[3]" /> : null}
                      S{setNum}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}