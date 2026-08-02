// Exportação de treinos em PDF A4 (modelo tabela: Exercício / Séries x Reps /
// Carga / Descanso / Observações). jsPDF + autoTable carregados sob demanda.

import { supabase } from "@/integrations/supabase/client";
import { METHODOLOGY_LABEL, type Methodology } from "./methodology";
import { fetchCoachBranding } from "./session-export";

export interface LinhaExercicioPdf {
  nome: string;
  seriesReps: string;
  carga: string;
  descanso: string;
  observacoes: string;
}

export interface SessaoPdf {
  titulo: string;
  subtitulo: string;
  linhas: LinhaExercicioPdf[];
}

export interface TreinoPdf {
  titulo: string;
  aluno?: string;
  periodo?: string;
  categoria?: string;
  sessoes: SessaoPdf[];
}

function fmtData(d?: string | null) {
  if (!d) return null;
  const dt = new Date(String(d).slice(0, 10) + "T00:00:00");
  return Number.isNaN(dt.getTime()) ? null : dt.toLocaleDateString("pt-BR");
}

function seriesReps(e: any): string {
  const reps = e.reps != null && String(e.reps).trim() !== "" ? String(e.reps).trim() : null;
  if (e.series != null && reps) return `${e.series}x${reps}`;
  if (reps) return reps;
  if (e.series != null) return `${e.series} séries`;
  return "—";
}

function nomeExercicio(e: any): string {
  const nome = e.exercises?.nome_pt ?? e.nome_livre ?? "Exercício";
  const lado = e.lado
    ? ` (${e.lado === "direito" ? "D" : e.lado === "esquerdo" ? "E" : e.lado})`
    : "";
  return `${nome}${lado}`;
}

/** Monta o conteúdo do PDF a partir das sessões selecionadas. */
export async function prepararTreinoPdf(sessionIds: string[]): Promise<TreinoPdf> {
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(
      "id, titulo, numero_dia, data, program_weeks(numero_semana, programs(id, titulo, descricao, metodologia, data_inicio, duracao_semanas))",
    )
    .in("id", sessionIds);
  if (error) throw new Error(error.message);
  const lista = sessions ?? [];
  if (lista.length === 0) throw new Error("Nenhuma sessão encontrada");

  const ordenadas = [...lista].sort((a: any, b: any) => {
    const sa = a.program_weeks?.numero_semana ?? 0;
    const sb = b.program_weeks?.numero_semana ?? 0;
    return sa - sb || (a.numero_dia ?? 0) - (b.numero_dia ?? 0);
  });

  const { data: blocks } = await supabase
    .from("session_blocks")
    .select(
      "id, session_id, ordem, titulo, formato, session_block_exercises(ordem, reps, series, carga_kg, descanso_seg, observacoes, lado, nome_livre, exercises(nome_pt))",
    )
    .in("session_id", ordenadas.map((s: any) => s.id))
    .order("ordem");

  const programa = (ordenadas[0] as any).program_weeks?.programs;
  const branding = await fetchCoachBranding();

  let aluno: string | undefined;
  if (programa?.id) {
    const { data: asg } = await supabase
      .from("assignments")
      .select("students(nome)")
      .eq("program_id", programa.id)
      .limit(1);
    aluno = (asg?.[0] as any)?.students?.nome ?? undefined;
  }

  const sessoes: SessaoPdf[] = ordenadas.map((s: any) => {
    const bl = (blocks ?? [])
      .filter((b: any) => b.session_id === s.id)
      .sort((a: any, z: any) => (a.ordem ?? 0) - (z.ordem ?? 0));
    const linhas: LinhaExercicioPdf[] = [];
    for (const b of bl) {
      const exs = (b.session_block_exercises ?? []).sort(
        (a: any, z: any) => (a.ordem ?? 0) - (z.ordem ?? 0),
      );
      for (const e of exs) {
        linhas.push({
          nome: nomeExercicio(e),
          seriesReps: seriesReps(e),
          carga: e.carga_kg != null ? `${e.carga_kg} kg` : "",
          descanso: e.descanso_seg != null ? `${e.descanso_seg}s` : "",
          observacoes: e.observacoes ?? "",
        });
      }
    }
    const semana = s.program_weeks?.numero_semana;
    return {
      titulo: `${s.titulo ?? `Treino ${s.numero_dia}`} • Dia ${s.numero_dia}`,
      subtitulo: [
        semana ? `Semana ${semana}` : null,
        fmtData(s.data),
        bl.map((b: any) => b.titulo).filter(Boolean).join(" · ") || null,
      ]
        .filter(Boolean)
        .join(" · "),
      linhas,
    };
  });

  const periodo = [fmtData(programa?.data_inicio), programa?.duracao_semanas ? `${programa.duracao_semanas} semana(s)` : null]
    .filter(Boolean)
    .join(" · ");

  return {
    titulo: programa?.titulo ?? "Programa de treino",
    aluno,
    periodo: periodo || undefined,
    categoria: [
      METHODOLOGY_LABEL[programa?.metodologia as Methodology] ?? programa?.metodologia,
      programa?.descricao,
      branding.nome ? `Coach: ${branding.nome}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    sessoes,
  };
}

/** Gera e baixa o PDF A4 no modelo de tabela. */
export async function exportarTreinoPdf(treino: TreinoPdf, nomeArquivo = "treino.pdf") {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 14;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text(treino.titulo, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  for (const linha of [
    treino.aluno ? `Aluno: ${treino.aluno}` : null,
    treino.periodo ? `Período: ${treino.periodo}` : null,
    treino.categoria || null,
  ].filter(Boolean) as string[]) {
    doc.text(linha, margin, y);
    y += 5;
  }
  y += 2;

  const pageH = doc.internal.pageSize.getHeight();

  for (const s of treino.sessoes) {
    if (y > pageH - 45) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text(s.titulo, margin, y);
    y += 5;
    if (s.subtitulo) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text(s.subtitulo, margin, y);
      y += 4;
    }
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Exercício", "Séries x Reps", "Carga", "Descanso", "Observações"]],
      body:
        s.linhas.length > 0
          ? s.linhas.map((l) => [l.nome, l.seriesReps, l.carga, l.descanso, l.observacoes])
          : [["Sem exercícios cadastrados", "", "", "", ""]],
      styles: { font: "helvetica", fontSize: 9, cellPadding: 2, textColor: [40, 40, 40] },
      headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 27 },
        2: { cellWidth: 18 },
        3: { cellWidth: 20 },
        4: { cellWidth: "auto" },
      },
      theme: "plain",
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
  }

  doc.save(nomeArquivo);
}

export async function exportarSessoesPdfTabela(
  sessionIds: string[],
  nomeArquivo = "treino.pdf",
) {
  const treino = await prepararTreinoPdf(sessionIds);
  await exportarTreinoPdf(treino, nomeArquivo);
}
