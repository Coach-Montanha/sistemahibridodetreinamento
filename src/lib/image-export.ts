// Geração de imagem 5760×2160 da sessão de treino (padrão TH_1/KF_1).
// Requer que a fonte Poppins esteja carregada no documento (via <link> no root).

import JSZip from "jszip";
import {
  LAYOUT_PADRAO,
  type ImageLayout,
} from "./program-image-layout";

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
  /** session_blocks.config.chave — presente em blocos gerados pelo motor
   * de molde (Híbrido/KB Fitness); ausente em blocos de outras modalidades. */
  chave?: string;
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
  /** Geometria opcional; sem isso usa o padrão 5760×2160. */
  layout?: ImageLayout;
}

interface Geometria {
  L: ImageLayout;
  linePitch: number;
  fontSize: number;
  subFontSize: number;
  logoFontSize: number;
  logoSubFontSize: number;
  leftX: number;
  leftW: number;
  mainX: number;
  mainW: number;
}

function geometria(layout?: ImageLayout): Geometria {
  const L = { ...LAYOUT_PADRAO, ...(layout ?? {}) };
  const s =
    L.escalaTexto * Math.min(L.largura / LAYOUT_PADRAO.largura, 1.35);
  const colUnit = (L.largura - L.margemX * 2) / 12;
  const temEsq = L.esquerdaSpan > 0;
  const leftX = L.margemX;
  const leftW = temEsq ? L.esquerdaSpan * colUnit - L.gap : 0;
  const mainX = temEsq ? L.margemX + L.esquerdaSpan * colUnit : L.margemX;
  const mainW = L.largura - L.margemX - mainX;
  return {
    L,
    linePitch: Math.max(24, Math.round(LINE_PITCH * s)),
    fontSize: Math.max(20, Math.round(FONT_SIZE * s)),
    subFontSize: Math.max(14, Math.round(SUB_FONT_SIZE * s)),
    logoFontSize: Math.max(22, Math.round(LOGO_FONT_SIZE * s)),
    logoSubFontSize: Math.max(12, Math.round(LOGO_SUB_FONT_SIZE * s)),
    leftX,
    leftW,
    mainX,
    mainW,
  };
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
  g: Geometria,
): number {
  let cursor = y;
  if (b.titulo) {
    ctx.fillStyle = corTexto;
    ctx.font = `800 ${g.fontSize}px "${FONT_FAMILY}", sans-serif`;
    ctx.fillText(b.titulo, x, cursor);
    cursor += pitch;
  }
  if (b.subtitulo) {
    ctx.fillStyle = corMuted;
    ctx.font = `500 ${g.subFontSize}px "${FONT_FAMILY}", sans-serif`;
    ctx.fillText(b.subtitulo, x, cursor);
    cursor += pitch;
  }
  ctx.fillStyle = corTexto;
  ctx.font = `700 ${g.fontSize}px "${FONT_FAMILY}", sans-serif`;
  for (const linha of b.linhas) {
    if (linha.texto) ctx.fillText(linha.texto, x, cursor);
    cursor += pitch;
  }
  return cursor - y;
}

function calcularPitchAdaptado(input: SessaoImagemInput, g: Geometria): number {
  const { L } = g;
  const alturaDisponivel = L.altura - L.margemTopo - L.margemBase;
  const base = g.linePitch;

  const alturaEsq = input.esquerda.reduce((acc, b, i) => {
    const gapExtra = i > 0 ? DIVIDER_GAP * 2 + 2 : 0;
    return acc + alturaBloco(b, base) + BLOCK_INNER_GAP + gapExtra;
  }, 0);

  const cols = L.colunasPrincipal || calcularGridPrincipal(input.principal.length);
  const linhas: BlocoImagem[][] = [];
  for (let i = 0; i < input.principal.length; i += cols) {
    linhas.push(input.principal.slice(i, i + cols));
  }
  const alturaMain = linhas.reduce((acc, linha, i) => {
    const alturaLinha = Math.max(...linha.map((b) => alturaBloco(b, base)));
    return acc + alturaLinha + (i > 0 ? L.gap : 0);
  }, 0);

  const alturaCritica = Math.max(alturaEsq, alturaMain);
  if (alturaCritica <= alturaDisponivel) return base;
  const fator = Math.max(0.75, alturaDisponivel / alturaCritica);
  return Math.floor(base * fator);
}

export async function renderizarSessaoCanvas(
  input: SessaoImagemInput,
): Promise<HTMLCanvasElement> {
  await garantirFontes();

  const g = geometria(input.layout);
  const { L } = g;

  const canvas = document.createElement("canvas");
  canvas.width = L.largura;
  canvas.height = L.altura;
  const ctx = canvas.getContext("2d")!;

  const transparente = input.corFundo === "transparent" || L.fundo === "transparente";
  if (!transparente) {
    ctx.fillStyle =
      input.corFundo ?? (L.fundo === "escuro" ? "#0F1115" : "#FFFFFF");
    ctx.fillRect(0, 0, L.largura, L.altura);
  }

  const corTexto =
    input.corTexto ?? (L.fundo === "escuro" ? "#F5F5F4" : "#000000");
  const corMuted = input.corMuted ?? withAlpha(corTexto, 0.55);
  const corDivisor = input.corDivisor ?? withAlpha(corTexto, 0.2);
  ctx.textBaseline = "top";

  const pitch = calcularPitchAdaptado(input, g);

  // ── Coluna esquerda (Preparação + Aquecimento) ────────────────────────────
  const temEsquerda = input.esquerda.length > 0 && L.esquerdaSpan > 0;
  let mainX = g.mainX;
  let mainW = g.mainW;

  if (temEsquerda) {
    let y = L.margemTopo;
    input.esquerda.forEach((bloco, i) => {
      if (i > 0) {
        y += DIVIDER_GAP;
        ctx.fillStyle = corDivisor;
        ctx.fillRect(g.leftX, y, g.leftW, 2);
        y += 2 + DIVIDER_GAP;
      }
      y += desenharBloco(ctx, bloco, g.leftX, y, pitch, corTexto, corMuted, g);
      y += BLOCK_INNER_GAP;
    });
  } else {
    // Sem faixa esquerda: a área principal ocupa toda a largura útil
    mainX = L.margemX;
    mainW = L.largura - L.margemX * 2;
  }

  // ── Área principal (Meio + Direita) ───────────────────────────────────────
  const blocosPrincipais = temEsquerda
    ? input.principal
    : [...input.esquerda, ...input.principal];
  const cols = L.colunasPrincipal || calcularGridPrincipal(blocosPrincipais.length);
  const colW = (mainW - L.gap * (cols - 1)) / cols;

  const linhas: BlocoImagem[][] = [];
  for (let i = 0; i < blocosPrincipais.length; i += cols) {
    linhas.push(blocosPrincipais.slice(i, i + cols));
  }

  let y = L.margemTopo;
  linhas.forEach((linha, li) => {
    if (li > 0) y += L.gap;
    let alturaLinha = 0;
    linha.forEach((bloco, ci) => {
      const x = mainX + ci * (colW + L.gap);
      const h = desenharBloco(ctx, bloco, x, y, pitch, corTexto, corMuted, g);
      if (h > alturaLinha) alturaLinha = h;
    });
    y += alturaLinha;
  });

  // ── Assinatura (Metodologia + Coach) ──────────────────────────────────────
  const baseY = L.altura - L.margemBase;
  ctx.fillStyle = corTexto;
  ctx.font = `800 ${g.logoFontSize}px "${FONT_FAMILY}", sans-serif`;
  ctx.fillText(input.metodologiaLabel, L.margemX, baseY);
  ctx.fillStyle = corMuted;
  ctx.font = `500 ${g.logoSubFontSize}px "${FONT_FAMILY}", sans-serif`;
  ctx.fillText(input.coachLabel, L.margemX + 10, baseY + g.logoFontSize + 8);

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

/** Exporta as sessões como PDF (uma página por sessão, alta densidade). */
export async function exportarSessoesPDF(
  sessoes: { input: SessaoImagemInput; nomeArquivo: string }[],
  nomeArquivo = "treinos.pdf",
) {
  const { jsPDF } = await import("jspdf");
  let doc: any = null;
  for (const { input } of sessoes) {
    const canvas = await renderizarSessaoCanvas(input);
    const orientacao = canvas.width >= canvas.height ? "landscape" : "portrait";
    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    if (!doc) {
      doc = new jsPDF({
        orientation: orientacao,
        unit: "px",
        format: [canvas.width, canvas.height],
        compress: true,
      });
    } else {
      doc.addPage([canvas.width, canvas.height], orientacao);
    }
    doc.addImage(dataUrl, "JPEG", 0, 0, canvas.width, canvas.height, undefined, "FAST");
  }
  if (doc) doc.save(nomeArquivo);
}

/** Preview leve (largura reduzida) para o dialog. */
/** Exporta as sessões como PDF A4 (uma sessão por página, ajustada à folha). */
export async function exportarSessoesPDFA4(
  sessoes: { input: SessaoImagemInput; nomeArquivo: string }[],
  nomeArquivo = "treinos-a4.pdf",
  margemMm = 10,
) {
  const { jsPDF } = await import("jspdf");
  let doc: any = null;
  for (const { input } of sessoes) {
    const canvas = await renderizarSessaoCanvas(input);
    const orientacao = canvas.width >= canvas.height ? "landscape" : "portrait";
    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    if (!doc) {
      doc = new jsPDF({ orientation: orientacao, unit: "mm", format: "a4", compress: true });
    } else {
      doc.addPage("a4", orientacao);
    }
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const escala = Math.min(
      (pageW - margemMm * 2) / canvas.width,
      (pageH - margemMm * 2) / canvas.height,
    );
    const w = canvas.width * escala;
    const h = canvas.height * escala;
    doc.addImage(dataUrl, "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, "FAST");
  }
  if (doc) doc.save(nomeArquivo);
}

/** Preview leve (largura reduzida) para o dialog. */
export async function renderizarPreviewDataURL(
  input: SessaoImagemInput,
  targetWidth = 1280,
): Promise<string> {
  const big = await renderizarSessaoCanvas(input);
  const scale = targetWidth / big.width;
  const small = document.createElement("canvas");
  small.width = targetWidth;
  small.height = Math.round(big.height * scale);
  const ctx = small.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(big, 0, 0, small.width, small.height);
  return small.toDataURL("image/png");
}