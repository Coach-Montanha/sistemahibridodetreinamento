import { cn } from "@/lib/utils";
import { withAlpha } from "./image-export-utils"; // Vamos criar esse utilitário para centralizar

const FONT_FAMILY = "Poppins";

export interface LinhaBloco {
  texto: string;
}
export interface BlocoImagem {
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
  corFundo?: string;
  corMuted?: string;
  corDivisor?: string;
  layout?: { largura: number; altura: number; fundo: string };
}

export async function renderizarSessaoCanvas(
  input: SessaoImagemInput,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const L = input.layout || { largura: 5760, altura: 2160, fundo: "claro" };
  canvas.width = L.largura;
  canvas.height = L.altura;
  const ctx = canvas.getContext("2d")!;

  // Renderização básica durante o reset
  ctx.fillStyle = L.fundo === "escuro" ? "#0F1115" : "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const corTexto = input.corTexto ?? (L.fundo === "escuro" ? "#F5F5F4" : "#000000");
  ctx.fillStyle = corTexto;
  ctx.font = `800 120px "${FONT_FAMILY}", sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(input.metodologiaLabel, 120, canvas.height - 260);

  return canvas;
}

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
  ctx.drawImage(big, 0, 0, small.width, small.height);
  return small.toDataURL("image/png");
}

export async function exportarSessaoImagem(
  input: SessaoImagemInput,
  nomeArquivo: string,
  formato: "png" | "jpg" = "png",
) {
  const canvas = await renderizarSessaoCanvas(input);
  const blob = await new Promise<Blob>((resolve) => 
    canvas.toBlob(b => resolve(b!), formato === "jpg" ? "image/jpeg" : "image/png")
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}.${formato}`;
  a.click();
  URL.revokeObjectURL(url);
}
