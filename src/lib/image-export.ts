// Geração de imagem 5760×2160 da sessão de treino (padrão TH_1/KF_1).
// Requer que a fonte Poppins esteja carregada no documento (via <link> no root).

import JSZip from "jszip";

const CANVAS_W = 5760;
const CANVAS_H = 2160;
const MARGIN_X = 120;
const MARGIN_TOP = 30;
const LINE_PITCH = 145;
const FONT_SIZE = 132;
const LOGO_FONT_SIZE = 150;
const LOGO_SUB_FONT_SIZE = 60;
const FONT_FAMILY = "Poppins";

const COLUMN_PRESETS: Record<number, number[]> = {
  1: [MARGIN_X],
  2: [MARGIN_X, 2671],
  3: [MARGIN_X, 2031, 3843],
};

export interface LinhaBloco {
  texto: string;
}
export interface ColunaImagem {
  linhas: LinhaBloco[];
}
export interface SessaoImagemInput {
  colunas: ColunaImagem[];
  metodologiaLabel: string;
  coachLabel: string;
  corTexto?: string;
  corFundo?: string; // "transparent" só faz sentido em PNG
}

let fontsPromise: Promise<void> | null = null;
async function garantirFontes() {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    if (typeof document === "undefined" || !(document as any).fonts) return;
    const fonts: FontFaceSet = (document as any).fonts;
    await Promise.all([
      fonts.load(`700 ${FONT_SIZE}px "${FONT_FAMILY}"`),
      fonts.load(`800 ${LOGO_FONT_SIZE}px "${FONT_FAMILY}"`),
      fonts.load(`500 ${LOGO_SUB_FONT_SIZE}px "${FONT_FAMILY}"`),
    ]);
  })();
  return fontsPromise;
}

export async function renderizarSessaoCanvas(
  input: SessaoImagemInput,
): Promise<HTMLCanvasElement> {
  await garantirFontes();

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;

  const transparente = input.corFundo === "transparent";
  if (!transparente) {
    ctx.fillStyle = input.corFundo ?? "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  ctx.fillStyle = input.corTexto ?? "#000000";
  ctx.textBaseline = "top";
  ctx.font = `700 ${FONT_SIZE}px "${FONT_FAMILY}", sans-serif`;

  const numCols = input.colunas.length;
  const colX = COLUMN_PRESETS[numCols] ?? distribuirColunas(numCols);

  input.colunas.forEach((coluna, i) => {
    const x = colX[i] ?? MARGIN_X;
    let y = MARGIN_TOP;
    for (const linha of coluna.linhas) {
      if (linha.texto) ctx.fillText(linha.texto, x, y);
      y += LINE_PITCH;
    }
  });

  ctx.font = `800 ${LOGO_FONT_SIZE}px "${FONT_FAMILY}", sans-serif`;
  ctx.fillText(input.metodologiaLabel, MARGIN_X, 1900);
  ctx.font = `500 ${LOGO_SUB_FONT_SIZE}px "${FONT_FAMILY}", sans-serif`;
  ctx.fillText(input.coachLabel, MARGIN_X + 10, 2050);

  return canvas;
}

function distribuirColunas(n: number): number[] {
  if (n <= 0) return [MARGIN_X];
  const larguraUtil = CANVAS_W - MARGIN_X * 2;
  const passo = larguraUtil / n;
  return Array.from({ length: n }, (_, i) => MARGIN_X + i * passo);
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  formato: "png" | "jpg",
): Promise<Blob> {
  const mime = formato === "jpg" ? "image/jpeg" : "image/png";
  const q = formato === "jpg" ? 0.95 : undefined;
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      mime,
      q,
    ),
  );
}

export async function exportarSessaoImagem(
  input: SessaoImagemInput,
  nomeArquivo: string,
  formato: "png" | "jpg" = "png",
) {
  const canvas = await renderizarSessaoCanvas(input);
  const blob = await canvasToBlob(canvas, formato);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}.${formato}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarSessoesEmMassa(
  sessoes: { input: SessaoImagemInput; nomeArquivo: string }[],
  formato: "png" | "jpg" = "png",
  nomeZip = "treinos.zip",
) {
  const zip = new JSZip();
  for (const { input, nomeArquivo } of sessoes) {
    const canvas = await renderizarSessaoCanvas(input);
    const blob = await canvasToBlob(canvas, formato);
    zip.file(`${nomeArquivo}.${formato}`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeZip;
  a.click();
  URL.revokeObjectURL(url);
}

/** Preview leve (largura reduzida) para o dialog. */
export async function renderizarPreviewDataURL(
  input: SessaoImagemInput,
  targetWidth = 1280,
): Promise<string> {
  const big = await renderizarSessaoCanvas(input);
  const scale = targetWidth / CANVAS_W;
  const small = document.createElement("canvas");
  small.width = targetWidth;
  small.height = Math.round(CANVAS_H * scale);
  const ctx = small.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(big, 0, 0, small.width, small.height);
  return small.toDataURL("image/png");
}