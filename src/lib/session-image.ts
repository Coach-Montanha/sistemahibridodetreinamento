import { supabase } from "@/integrations/supabase/client";
import { fetchCoachBranding } from "./session-export";
import { METHODOLOGY_LABEL, type Methodology } from "./methodology";
import type { SessaoImagemInput, ColunaImagem, LinhaBloco } from "./image-export";

const METODOLOGIA_SIGLA: Record<string, string> = {
  hibrido: "TH",
  kettlebell_fitness: "KF",
  kettlebell_sport: "KS",
  levantamento_peso: "LP",
  musculacao: "MU",
};

const DIA_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function formatarLinhaExercicio(e: any): string {
  const nome = (e.exercises?.nome_pt ?? e.nome_livre ?? "Exercício").toString().toUpperCase();
  const lado = e.lado
    ? ` (${e.lado === "direito" ? "D" : e.lado === "esquerdo" ? "E" : String(e.lado).toUpperCase()})`
    : "";
  const reps =
    e.reps != null && String(e.reps).trim() !== ""
      ? String(e.reps).toUpperCase()
      : e.series != null
        ? `${e.series}x`
        : "";
  return `${reps ? reps + " " : ""}${nome}${lado}`.trim();
}

function tituloBloco(b: any): string {
  const base = (b.titulo ?? b.formato ?? "").toString().toUpperCase();
  const dur = b.duracao_min ? ` (${b.duracao_min}')` : "";
  return `${base}${dur}`;
}

function subtituloFormato(b: any): string | null {
  const cfg = b.config ?? {};
  const rounds = cfg.rounds ?? cfg.num_rounds;
  const clusters = cfg.clusters ?? cfg.num_clusters;
  if (clusters && cfg.cluster_min) return `${clusters} CLUSTERS ROUNDS (${cfg.cluster_min}' CADA)`;
  if (rounds) return `${rounds} ROUNDS`;
  return null;
}

function nomeArquivoSessao(session: any, metodologia: string): string {
  const sigla = METODOLOGIA_SIGLA[metodologia] ?? metodologia.slice(0, 2).toUpperCase();
  const num = session.numero_dia ?? 1;
  let dia = "Sessao";
  if (session.data) {
    const d = new Date(session.data + "T00:00:00");
    dia = DIA_SEMANA[d.getDay()] ?? dia;
  }
  return `${sigla}_${num}_-_${dia}`;
}

async function montarInputDeBlocos(
  blocks: any[],
  metodologia: string,
  coachNome: string,
): Promise<SessaoImagemInput> {
  const preparacao = blocks.filter((b) => b.formato === "preparacao_movimento");
  const trabalho = blocks.filter((b) => b.formato !== "preparacao_movimento");

  function linhasDeBloco(b: any): LinhaBloco[] {
    const linhas: LinhaBloco[] = [{ texto: tituloBloco(b) }];
    const sub = subtituloFormato(b);
    if (sub) linhas.push({ texto: sub });
    const exs = (b.session_block_exercises ?? []).sort(
      (a: any, z: any) => (a.ordem ?? 0) - (z.ordem ?? 0),
    );
    for (const e of exs) linhas.push({ texto: formatarLinhaExercicio(e) });
    return linhas;
  }

  const colunas: ColunaImagem[] = [];

  // Coluna 1: Preparação de Movimento (junta todos os blocos de preparação num só)
  const linhasPrep: LinhaBloco[] = [{ texto: "PREPARAÇÃO DE MOVIMENTO" }];
  for (const b of preparacao) {
    if (linhasPrep.length > 1) linhasPrep.push({ texto: "+" });
    const bloco = linhasDeBloco(b);
    // bloco[0] já é o título — em Preparação simplificamos removendo (o cabeçalho é fixo)
    linhasPrep.push(...bloco.slice(1));
  }
  colunas.push({ linhas: linhasPrep });

  // Colunas seguintes: uma por bloco de trabalho
  for (const b of trabalho) {
    colunas.push({ linhas: linhasDeBloco(b) });
  }

  return {
    colunas,
    metodologiaLabel: (METHODOLOGY_LABEL[metodologia as Methodology] ?? metodologia).toUpperCase(),
    coachLabel: `by ${coachNome}`,
  };
}

export interface SessaoImagemPreparada {
  input: SessaoImagemInput;
  nomeArquivo: string;
}

async function fetchSessionFull(sessionId: string) {
  const { data: session, error } = await supabase
    .from("sessions")
    .select(
      "id, titulo, numero_dia, data, program_week_id, program_weeks(numero_semana, programs(titulo, metodologia))",
    )
    .eq("id", sessionId)
    .single();
  if (error || !session) throw new Error(error?.message ?? "Sessão não encontrada");

  const { data: blocks } = await supabase
    .from("session_blocks")
    .select(
      "id, ordem, titulo, formato, duracao_min, config, session_block_exercises(ordem, reps, series, pct_1rm, lado, nome_livre, exercises(nome_pt))",
    )
    .eq("session_id", sessionId)
    .order("ordem");

  const metodologia = (session as any).program_weeks?.programs?.metodologia ?? "hibrido";
  return { session, blocks: blocks ?? [], metodologia };
}

export async function prepararSessaoParaImagem(
  sessionId: string,
): Promise<SessaoImagemPreparada> {
  const [{ session, blocks, metodologia }, branding] = await Promise.all([
    fetchSessionFull(sessionId),
    fetchCoachBranding(),
  ]);
  const input = await montarInputDeBlocos(blocks, metodologia, branding.nome);
  return { input, nomeArquivo: nomeArquivoSessao(session, metodologia) };
}

export async function prepararSessoesParaImagem(
  sessionIds: string[],
): Promise<SessaoImagemPreparada[]> {
  const branding = await fetchCoachBranding();
  const out: SessaoImagemPreparada[] = [];
  for (const id of sessionIds) {
    const { session, blocks, metodologia } = await fetchSessionFull(id);
    const input = await montarInputDeBlocos(blocks, metodologia, branding.nome);
    out.push({ input, nomeArquivo: nomeArquivoSessao(session, metodologia) });
  }
  return out;
}