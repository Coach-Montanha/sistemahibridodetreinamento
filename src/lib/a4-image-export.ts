// Renderiza as sessões no MESMO modelo do PDF A4 (tabela) em canvas,
// permitindo exportar PNG/JPG com estrutura idêntica à do PDF padrão.

import JSZip from "jszip";
import { prepararTreinoPdf, type SessaoPdf, type TreinoPdf } from "./pdf-treino";

// A4 retrato a ~150 dpi
const W = 1240;
const H = 1754;
const M = 70;

const COLS = [0.34, 0.16, 0.11, 0.12, 0.27]; // Exercício, Séries x Reps, Carga, Descanso, Obs
const HEADS = ["Exercício", "Séries x Reps", "Carga", "Descanso", "Observações"];

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  if (!text) return [""];
  const palavras = String(text).split(/\s+/);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tentativa).width <= max || !atual) atual = tentativa;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Desenha uma sessão (uma ou mais páginas A4) e devolve os canvases. */
function desenharSessao(treino: TreinoPdf, sessao: SessaoPdf): HTMLCanvasElement[] {
  const paginas: HTMLCanvasElement[] = [];
  const larguraUtil = W - M * 2;
  const larguras = COLS.map((c) => c * larguraUtil);

  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let y = 0;

  const novaPagina = (comCabecalho: boolean) => {
    canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "top";
    paginas.push(canvas);
    y = M;

    if (comCabecalho) {
      ctx.fillStyle = "#141414";
      ctx.font = '700 34px "Poppins", Helvetica, sans-serif';
      ctx.fillText(treino.titulo, M, y);
      y += 44;
      ctx.fillStyle = "#5A5A5A";
      ctx.font = '400 17px "Poppins", Helvetica, sans-serif';
      for (const linha of [
        treino.aluno ? `Aluno: ${treino.aluno}` : null,
        treino.periodo ? `Período: ${treino.periodo}` : null,
        treino.categoria || null,
      ].filter(Boolean) as string[]) {
        for (const l of wrap(ctx, linha, larguraUtil)) {
          ctx.fillText(l, M, y);
          y += 24;
        }
      }
      y += 14;
    }

    // Título da sessão
    ctx.fillStyle = "#141414";
    ctx.font = '700 22px "Poppins", Helvetica, sans-serif';
    ctx.fillText(sessao.titulo, M, y);
    y += 30;
    if (sessao.subtitulo) {
      ctx.fillStyle = "#6E6E6E";
      ctx.font = '400 15px "Poppins", Helvetica, sans-serif';
      for (const l of wrap(ctx, sessao.subtitulo, larguraUtil)) {
        ctx.fillText(l, M, y);
        y += 20;
      }
    }
    y += 10;
    cabecalhoTabela();
  };

  const cabecalhoTabela = () => {
    const alturaH = 34;
    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(M, y, larguraUtil, alturaH);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = '700 14px "Poppins", Helvetica, sans-serif';
    let x = M;
    HEADS.forEach((h, i) => {
      ctx.fillText(h, x + 8, y + 10);
      x += larguras[i];
    });
    y += alturaH;
  };

  novaPagina(true);

  const linhas =
    sessao.linhas.length > 0
      ? sessao.linhas.map((l) => [l.nome, l.seriesReps, l.carga, l.descanso, l.observacoes])
      : [["Sem exercícios cadastrados", "", "", "", ""]];

  linhas.forEach((celulas, idx) => {
    ctx.font = '400 14px "Poppins", Helvetica, sans-serif';
    const linhasCel = celulas.map((c, i) => wrap(ctx, c ?? "", larguras[i] - 16));
    const maxLinhas = Math.max(...linhasCel.map((l) => l.length));
    const alturaLinha = maxLinhas * 20 + 14;

    if (y + alturaLinha > H - M) {
      novaPagina(false);
      ctx.font = '400 14px "Poppins", Helvetica, sans-serif';
    }

    if (idx % 2 === 1) {
      ctx.fillStyle = "#F5F5F5";
      ctx.fillRect(M, y, larguraUtil, alturaLinha);
    }
    ctx.fillStyle = "#282828";
    let x = M;
    linhasCel.forEach((cel, i) => {
      cel.forEach((l, li) => ctx.fillText(l, x + 8, y + 7 + li * 20));
      x += larguras[i];
    });
    y += alturaLinha;
  });

  return paginas;
}

function toBlob(canvas: HTMLCanvasElement, formato: "png" | "jpg"): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      formato === "jpg" ? "image/jpeg" : "image/png",
      formato === "jpg" ? 0.95 : undefined,
    ),
  );
}

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase()
    .slice(0, 60);
}

/**
 * Exporta as sessões como imagens A4 (mesmo layout do PDF padrão).
 * Retorna a quantidade de imagens geradas.
 */
export async function exportarSessoesImagemA4(
  sessionIds: string[],
  formato: "png" | "jpg" = "png",
  nomeZip = `treinos_${formato}.zip`,
): Promise<number> {
  const treino = await prepararTreinoPdf(sessionIds);
  const arquivos: { nome: string; blob: Blob }[] = [];

  for (const sessao of treino.sessoes) {
    const paginas = desenharSessao(treino, sessao);
    for (let i = 0; i < paginas.length; i++) {
      const sufixo = paginas.length > 1 ? `-p${i + 1}` : "";
      arquivos.push({
        nome: `${slug(sessao.titulo) || "sessao"}${sufixo}.${formato}`,
        blob: await toBlob(paginas[i], formato),
      });
    }
  }

  if (arquivos.length === 1) {
    const url = URL.createObjectURL(arquivos[0].blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = arquivos[0].nome;
    a.click();
    URL.revokeObjectURL(url);
    return 1;
  }

  const zip = new JSZip();
  arquivos.forEach((f) => zip.file(f.nome, f.blob));
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeZip;
  a.click();
  URL.revokeObjectURL(url);
  return arquivos.length;
}
