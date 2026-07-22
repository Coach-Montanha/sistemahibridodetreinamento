// Geração de imagem 5760×2160 da sessão de treino (padrão TH_1/KF_1).
// Requer que a fonte Poppins esteja carregada no documento (via <link> no root).

import JSZip from "jszip";

const CANVAS_W = 5760;
const CANVAS_H = 2160;
const MARGIN_X = 120;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 260; // reservado à assinatura Metodologia/Coach
const LINE_PITCH = 145;
const FONT_SIZE = 132;
const SUB_FONT_SIZE = 88;
const LOGO_FONT_SIZE = 150;
const LOGO_SUB_FONT_SIZE = 60;
const FONT_FAMILY = "Poppins";

// Layout: coluna esquerda para prep/aquecimento; meio+direita para blocos de trabalho.
const LEFT_COL_X = MARGIN_X;
const LEFT_COL_RIGHT = 1900;
const LEFT_COL_WIDTH = LEFT_COL_RIGHT - LEFT_COL_X;
const MAIN_X = 2100;
const MAIN_RIGHT = CANVAS_W - MARGIN_X;
const MAIN_WIDTH = MAIN_RIGHT - MAIN_X;
const GAP = 96; // respiro entre blocos (múltiplo de 8)
const DIVIDER_GAP = 32;
const BLOCK_INNER_GAP = 24;

export interface LinhaBloco {
  texto: string;
}
export interface BlocoImagem {
  titulo?: string;
  subtitulo?: string | null;
  linhas: LinhaBloco[];
}
export interface SessaoImagemInput {
  esquerda: BlocoImagem[];
  principal: BlocoImagem[];
  metodologiaLabel: string;
  coachLabel: string;
  corTexto?: string;
  corFundo?: string; // "transparent" só faz sentido em PNG
  corMuted?: string;
  corDivisor?: string;
}

let fontsPromise: Promise<void> | null = null;
async function garantirFontes() {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    if (typeof document === "undefined" || !(document as any).fonts) return;
    const fonts: FontFaceSet = (document as any).fonts;
    await Promise.all([
      fonts.load(`700 ${FONT_SIZE}px "${FONT_FAMILY}"`),
      fonts.load(`800 ${FONT_SIZE}px "${FONT_FAMILY}"`),
      fonts.load(`500 ${SUB_FONT_SIZE}px "${FONT_FAMILY}"`),
      fonts.load(`800 ${LOGO_FONT_SIZE}px "${FONT_FAMILY}"`),
      fonts.load(`500 ${LOGO_SUB_FONT_SIZE}px "${FONT_FAMILY}"`),
    ]);
  })();
  return fontsPromise;
}

function alturaBloco(b: BlocoImagem, pitch: number): number {
  let n = 0;
  if (b.titulo) n += 1;
  if (b.subtitulo) n += 1;
  n += b.linhas.length;
  return n * pitch;
}

function calcularGridPrincipal(n: number): number {
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 4) return 2;
  return 3;
}

function desenharBloco(
  ctx: CanvasRenderingContext2D,
  b: BlocoImagem,
  x: number,
  y: number,
  pitch: number,
  corTexto: string,
  corMuted: string,
): number {
  let cursor = y;
  if (b.titulo) {
    ctx.fillStyle = corTexto;
    ctx.font = `800 ${FONT_SIZE}px "${FONT_FAMILY}", sans-serif`;
    ctx.fillText(b.titulo, x, cursor);
    cursor += pitch;
  }
  if (b.subtitulo) {
    ctx.fillStyle = corMuted;
    ctx.font = `500 ${SUB_FONT_SIZE}px "${FONT_FAMILY}", sans-serif`;
    ctx.fillText(b.subtitulo, x, cursor);
    cursor += pitch;
  }
  ctx.fillStyle = corTexto;
  ctx.font = `700 ${FONT_SIZE}px "${FONT_FAMILY}", sans-serif`;
  for (const linha of b.linhas) {
    if (linha.texto) ctx.fillText(linha.texto, x, cursor);
    cursor += pitch;
  }
  return cursor - y;
}

function calcularPitchAdaptado(input: SessaoImagemInput): number {
  const alturaDisponivel = CANVAS_H - MARGIN_TOP - MARGIN_BOTTOM;

  const alturaEsq = input.esquerda.reduce((acc, b, i) => {
    const gapExtra = i > 0 ? DIVIDER_GAP * 2 + 2 : 0;
    return acc + alturaBloco(b, LINE_PITCH) + BLOCK_INNER_GAP + gapExtra;
  }, 0);

  const cols = calcularGridPrincipal(input.principal.length);
  const linhas: BlocoImagem[][] = [];
  for (let i = 0; i < input.principal.length; i += cols) {
    linhas.push(input.principal.slice(i, i + cols));
  }
  const alturaMain = linhas.reduce((acc, linha, i) => {
    const alturaLinha = Math.max(...linha.map((b) => alturaBloco(b, LINE_PITCH)));
    return acc + alturaLinha + (i > 0 ? GAP : 0);
  }, 0);

  const alturaCritica = Math.max(alturaEsq, alturaMain);
  if (alturaCritica <= alturaDisponivel) return LINE_PITCH;
  const fator = Math.max(0.75, alturaDisponivel / alturaCritica);
  return Math.floor(LINE_PITCH * fator);
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

  const corTexto = input.corTexto ?? "#000000";
  const corMuted = input.corMuted ?? withAlpha(corTexto, 0.55);
  const corDivisor = input.corDivisor ?? withAlpha(corTexto, 0.2);
  ctx.textBaseline = "top";

  const pitch = calcularPitchAdaptado(input);

  // ── Coluna esquerda (Preparação + Aquecimento) ────────────────────────────
  const temEsquerda = input.esquerda.length > 0;
  let mainX = MAIN_X;
  let mainW = MAIN_WIDTH;

  if (temEsquerda) {
    let y = MARGIN_TOP;
    input.esquerda.forEach((bloco, i) => {
      if (i > 0) {
        y += DIVIDER_GAP;
        ctx.fillStyle = corDivisor;
        ctx.fillRect(LEFT_COL_X, y, LEFT_COL_WIDTH, 2);
        y += 2 + DIVIDER_GAP;
      }
      y += desenharBloco(ctx, bloco, LEFT_COL_X, y, pitch, corTexto, corMuted);
      y += BLOCK_INNER_GAP;
    });
  } else {
    // Sem coluna esquerda: área principal expande da margem
    mainX = MARGIN_X;
    mainW = CANVAS_W - MARGIN_X * 2;
  }

  // ── Área principal (Meio + Direita) ───────────────────────────────────────
  const cols = calcularGridPrincipal(input.principal.length);
  const colW = (mainW - GAP * (cols - 1)) / cols;

  const linhas: BlocoImagem[][] = [];
  for (let i = 0; i < input.principal.length; i += cols) {
    linhas.push(input.principal.slice(i, i + cols));
  }

  let y = MARGIN_TOP;
  linhas.forEach((linha, li) => {
    if (li > 0) y += GAP;
    let alturaLinha = 0;
    linha.forEach((bloco, ci) => {
      const x = mainX + ci * (colW + GAP);
      const h = desenharBloco(ctx, bloco, x, y, pitch, corTexto, corMuted);
      if (h > alturaLinha) alturaLinha = h;
    });
    y += alturaLinha;
  });

  // ── Assinatura (Metodologia + Coach) ──────────────────────────────────────
  ctx.fillStyle = corTexto;
  ctx.font = `800 ${LOGO_FONT_SIZE}px "${FONT_FAMILY}", sans-serif`;
  ctx.fillText(input.metodologiaLabel, MARGIN_X, 1900);
  ctx.fillStyle = corMuted;
  ctx.font = `500 ${LOGO_SUB_FONT_SIZE}px "${FONT_FAMILY}", sans-serif`;
  ctx.fillText(input.coachLabel, MARGIN_X + 10, 2050);

  return canvas;
}

function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${m[1]}${a}`;
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