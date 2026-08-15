import { supabase } from "@/integrations/supabase/client";
import { fetchCoachBranding } from "./session-export";
import { METHODOLOGY_LABEL, type Methodology } from "./methodology";
import type { SessaoImagemInput, BlocoImagem, LinhaBloco } from "./image-export";

const METODOLOGIA_SIGLA: Record<string, string> = {
  hibrido: "TH",
  kettlebell_fitness: "KF",
  kettlebell_sport: "KS",
  levantamento_peso: "LP",
  musculacao: "MU",
  treinamento_funcional: "TF",
  corrida: "CO",
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
  
  const partes: string[] = [];
  if (e.pct_1rm != null) {
    partes.push(`${e.pct_1rm}%`);
  } else if (e.carga_kg != null) {
    partes.push(`${e.carga_kg}KG`);
  }

  const reps =
    e.reps != null && String(e.reps).trim() !== ""
      ? String(e.reps).toUpperCase()
      : e.series != null
        ? `${e.series}X`
        : "";
  
  if (reps) partes.push(reps);

  return `${partes.join(" ")} ${nome}${lado}`.trim();
}

function tituloBloco(b: any): string {
  if (b.formato === "mobilidade") return "BLOCO DE MOBILIDADE" + (b.duracao_min ? ` (${b.duracao_min}')` : "");
  if (ehAquecimento(b)) return "AQUECIMENTO" + (b.duracao_min ? ` (${b.duracao_min}')` : "");
  
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

function ehAquecimento(b: any): boolean {
  const t = (b.titulo ?? "").toString().toLowerCase();
  return t.includes("aquecimento");
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
  function linhasExerciciosDe(b: any): LinhaBloco[] {
    const exs = (b.session_block_exercises ?? []).sort(
      (a: any, z: any) => (a.ordem ?? 0) - (z.ordem ?? 0),
    );
    return exs.map((e: any) => ({ texto: formatarLinhaExercicio(e) }));
  }

  function blocoParaImagem(b: any, tituloForcado?: string): BlocoImagem {
    return {
      chave: b.id, // Usamos o ID real do bloco como chave única
      titulo: (tituloForcado ?? tituloBloco(b)).toUpperCase(),
      subtitulo: subtituloFormato(b),
      linhas: linhasExerciciosDe(b),
    };
  }

  const principal: BlocoImagem[] = blocks.map(b => blocoParaImagem(b));

  return {
    esquerda: [], // No canvas livre, todos os blocos estão na lista principal para posicionamento
    principal,
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
      "id, titulo, numero_dia, data, program_week_id, program_weeks(numero_semana, programs(id, titulo, metodologia))",
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
