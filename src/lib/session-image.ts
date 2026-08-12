import { supabase } from "@/integrations/supabase/client";
import { fetchCoachBranding } from "./session-export";
import { METHODOLOGY_LABEL, type Methodology } from "./methodology";
import type { SessaoImagemInput, BlocoImagem, LinhaBloco } from "./image-export";
import { carregarLayout, type PosicaoBloco } from "@/lib/program-image-layout";


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
  posicoesBlocos?: PosicaoBloco[],
): Promise<SessaoImagemInput> {
  function linhasExerciciosDe(b: any): LinhaBloco[] {
    const exs = (b.session_block_exercises ?? []).sort(
      (a: any, z: any) => (a.ordem ?? 0) - (z.ordem ?? 0),
    );
    return exs.map((e: any) => ({ texto: formatarLinhaExercicio(e) }));
  }

  function blocoParaImagem(b: any, tituloForcado?: string): BlocoImagem {
    return {
      chave: b.config?.chave, // novo — só existe em blocos do motor de molde
      titulo: (tituloForcado ?? tituloBloco(b)).toUpperCase(),
      subtitulo: subtituloFormato(b),
      linhas: linhasExerciciosDe(b),
    };
  }

  const esquerda: BlocoImagem[] = [];
  const principal: BlocoImagem[] = [];

  // Se HÁ posicoesBlocos E todo bloco com chave tem uma posição definida,
  // usa a posição manual. Caso contrário (programa antigo, ou modalidade
  // sem molde), mantém a heurística automática — retrocompatível.
  const mapaPosicoes = new Map((posicoesBlocos ?? []).map((p) => [p.chave, p]));
  const todasChaves = blocks.every((b) => !b.config?.chave || mapaPosicoes.has(b.config.chave));
  const usaPosicaoManual = (posicoesBlocos?.length ?? 0) > 0 && todasChaves;

  if (usaPosicaoManual) {
    const comPosicao = blocks
      .map((b) => ({ b, pos: mapaPosicoes.get(b.config?.chave) }))
      .filter((x): x is { b: any; pos: PosicaoBloco } => !!x.pos)
      .sort((x, y) => x.pos.ordem - y.pos.ordem);

    for (const { b, pos } of comPosicao) {
      const tituloForcado =
        b.formato === "mobilidade"
          ? "BLOCO DE MOBILIDADE"
          : ehAquecimento(b)
            ? "AQUECIMENTO"
            : undefined;
      const item = blocoParaImagem(b, tituloForcado);
      (pos.zona === "esquerda" ? esquerda : principal).push(item);
    }
  } else {
    for (const b of blocks) {
      if (b.formato === "mobilidade") {
        esquerda.push(blocoParaImagem(b, "BLOCO DE MOBILIDADE"));
      } else if (ehAquecimento(b)) {
        esquerda.push(blocoParaImagem(b, "AQUECIMENTO"));
      } else {
        principal.push(blocoParaImagem(b));
      }
    }
  }


  return {
    esquerda,
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
  const programId = (session as any).program_weeks?.programs?.id;
  const { layout } = programId ? carregarLayout(programId, metodologia) : { layout: undefined };
  const input = await montarInputDeBlocos(blocks, metodologia, branding.nome, layout?.posicoesBlocos);
  return { input, nomeArquivo: nomeArquivoSessao(session, metodologia) };
}

export async function prepararSessoesParaImagem(
  sessionIds: string[],
): Promise<SessaoImagemPreparada[]> {
  const branding = await fetchCoachBranding();
  const out: SessaoImagemPreparada[] = [];
  for (const id of sessionIds) {
    const { session, blocks, metodologia } = await fetchSessionFull(id);
    const programId = (session as any).program_weeks?.programs?.id;
    const { layout } = programId ? carregarLayout(programId, metodologia) : { layout: undefined };
    const input = await montarInputDeBlocos(blocks, metodologia, branding.nome, layout?.posicoesBlocos);
    out.push({ input, nomeArquivo: nomeArquivoSessao(session, metodologia) });
  }
  return out;
}
