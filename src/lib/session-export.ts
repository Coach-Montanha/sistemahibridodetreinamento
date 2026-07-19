import { supabase } from "@/integrations/supabase/client";
import {
  exportarSemanaPDF,
  exportarSemanaExcel,
  type CoachBranding,
  type SemanaExport,
  type SessaoExport,
} from "./export";

export async function fetchCoachBranding(): Promise<CoachBranding> {
  const { data } = await supabase
    .from("coaches")
    .select("nome, logo_url, cor_primaria, cor_secundaria, rodape_export")
    .maybeSingle();
  return {
    nome: data?.nome ?? "Coach",
    logoUrl: data?.logo_url ?? undefined,
    corPrimaria: data?.cor_primaria ?? "#F26B1F",
    corSecundaria: data?.cor_secundaria ?? "#0F1115",
    rodape: data?.rodape_export ?? undefined,
  };
}

function formatarExercicio(e: any): string {
  const nome = e.exercises?.nome_pt ?? e.nome_livre ?? "Exercício";
  const lado = e.lado ? ` (${e.lado === "direito" ? "D" : e.lado === "esquerdo" ? "E" : e.lado})` : "";
  const partes: string[] = [];
  if (e.pct_1rm != null) partes.push(`${e.pct_1rm}%`);
  if (e.series != null && e.reps != null) partes.push(`${e.series}x${e.reps}`);
  else if (e.reps != null) partes.push(String(e.reps));
  else if (e.series != null) partes.push(`${e.series} séries`);
  const prefix = partes.join(" ");
  return `${prefix ? prefix + " " : ""}${nome}${lado}`.trim();
}

async function loadSessaoExport(sessionId: string): Promise<{
  semana: SemanaExport;
}> {
  const { data: session, error: se } = await supabase
    .from("sessions")
    .select(
      "id, titulo, numero_dia, data, program_week_id, program_weeks(numero_semana, programs(titulo))",
    )
    .eq("id", sessionId)
    .single();
  if (se || !session) throw new Error(se?.message ?? "Sessão não encontrada");

  const { data: blocks } = await supabase
    .from("session_blocks")
    .select(
      "id, ordem, titulo, formato, duracao_min, session_block_exercises(ordem, reps, series, pct_1rm, lado, nome_livre, exercises(nome_pt))",
    )
    .eq("session_id", sessionId)
    .order("ordem");

  const sessao: SessaoExport = {
    titulo: session.titulo ?? `Dia ${session.numero_dia}`,
    blocos: (blocks ?? []).map((b: any) => {
      const linhas = (b.session_block_exercises ?? [])
        .sort((a: any, z: any) => a.ordem - z.ordem)
        .map(formatarExercicio);
      return {
        titulo: b.titulo ?? b.formato,
        conteudo: linhas.join("\n"),
      };
    }),
  };

  const programa = (session as any).program_weeks?.programs?.titulo ?? "Programa";
  const semanaN = (session as any).program_weeks?.numero_semana;
  return {
    semana: {
      titulo: programa,
      subtitulo: [
        semanaN ? `Semana ${semanaN}` : null,
        session.data ? new Date(session.data + "T00:00:00").toLocaleDateString("pt-BR") : null,
      ]
        .filter(Boolean)
        .join(" · "),
      sessoes: [sessao],
    },
  };
}

export async function exportarSessaoPDF(sessionId: string) {
  const [{ semana }, branding] = await Promise.all([
    loadSessaoExport(sessionId),
    fetchCoachBranding(),
  ]);
  await exportarSemanaPDF(semana, branding);
}

export async function exportarSessaoExcel(sessionId: string) {
  const [{ semana }, branding] = await Promise.all([
    loadSessaoExport(sessionId),
    fetchCoachBranding(),
  ]);
  exportarSemanaExcel(semana, branding);
}