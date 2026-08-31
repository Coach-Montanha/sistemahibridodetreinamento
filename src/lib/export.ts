// src/lib/export.ts
//
// Exportação de sessão/semana/mês/ano em PDF e Excel, com a marca do coach
// (logo, cores, rodapé). Roda no navegador (React), usando jsPDF e SheetJS —
// ambas disponíveis no ambiente do Lovable.
//
// npm: jspdf, jspdf-autotable, xlsx

export interface CoachBranding {
  nome: string;
  logoUrl?: string;      // URL pública do bucket coach-branding
  corPrimaria: string;   // ex: '#111111'
  corSecundaria: string; // ex: '#F5F5F5'
  rodape?: string;       // ex: '@seuinstagram | seusite.com'
}

export interface SessaoExport {
  titulo: string;        // ex: "Dia 1 · Segunda"
  blocos: { titulo: string; conteudo: string }[]; // conteúdo já formatado, uma linha por exercício
}

export interface SemanaExport {
  titulo: string;        // ex: "Treinamento Híbrido — Semana 1"
  subtitulo: string;      // ex: "19 a 23 de Janeiro de 2026"
  sessoes: SessaoExport[];
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export async function exportarSemanaPDF(semana: SemanaExport, branding: CoachBranding) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let cursorY = 0;

  // Cabeçalho com logo (se houver) e cor de marca
  doc.setFillColor(branding.corPrimaria);
  doc.rect(0, 0, pageWidth, 24, "F");

  if (branding.logoUrl) {
    try {
      const logoData = await carregarImagemBase64(branding.logoUrl);
      doc.addImage(logoData, "PNG", margin, 4, 16, 16);
    } catch {
      // se o logo falhar ao carregar, segue sem travar a exportação
    }
  }

  doc.setTextColor("#FFFFFF");
  doc.setFontSize(16);
  doc.text(semana.titulo, margin + (branding.logoUrl ? 20 : 0), 12);
  doc.setFontSize(9);
  doc.text(semana.subtitulo, margin + (branding.logoUrl ? 20 : 0), 18);

  cursorY = 32;
  doc.setTextColor("#000000");

  for (const sessao of semana.sessoes) {
    doc.setFontSize(12);
    doc.setTextColor(branding.corPrimaria);
    doc.text(sessao.titulo, margin, cursorY);
    cursorY += 4;

    const rows = sessao.blocos.map((b) => [b.titulo, b.conteudo]);

    autoTable(doc, {
      startY: cursorY,
      head: [["Bloco", "Conteúdo"]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2, valign: "top" },
      headStyles: { fillColor: branding.corPrimaria, textColor: "#FFFFFF" },
      columnStyles: { 0: { cellWidth: 35, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
      margin: { left: margin, right: margin },
    });

    // @ts-ignore — jspdf-autotable expõe lastAutoTable no doc
    cursorY = doc.lastAutoTable.finalY + 8;

    if (cursorY > 260) {
      doc.addPage();
      cursorY = 20;
    }
  }

  if (branding.rodape) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor("#888888");
      doc.text(branding.rodape, margin, 290);
    }
  }

  doc.save(`${slugify(semana.titulo)}.pdf`);
}

// ---------------------------------------------------------------------------
// EXCEL
// ---------------------------------------------------------------------------
export async function exportarSemanaExcel(semana: SemanaExport, branding: CoachBranding) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const aoa: (string)[][] = [
    [semana.titulo],
    [semana.subtitulo],
    [],
    ["Dia", "Bloco", "Conteúdo"],
  ];

  for (const sessao of semana.sessoes) {
    sessao.blocos.forEach((b, i) => {
      aoa.push([i === 0 ? sessao.titulo : "", b.titulo, b.conteudo]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 70 }];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Semana");
  XLSX.writeFile(wb, `${slugify(semana.titulo)}.xlsx`);
}

// ---------------------------------------------------------------------------
// Helpers
async function carregarImagemBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Exemplo de uso na tela de Sessão/Semana:
//
// import { exportarSemanaPDF, exportarSemanaExcel } from "@/lib/export";
//
// <Button onClick={() => exportarSemanaPDF(semanaData, coachBranding)}>Exportar PDF</Button>
// <Button onClick={() => exportarSemanaExcel(semanaData, coachBranding)}>Exportar Excel</Button>
//
// `semanaData` é montado a partir das tabelas sessions/session_blocks/session_block_exercises
// (join simples, formatando cada bloco em texto como já aparece no construtor de sessão).
// Para exportar "mês" ou "ano", chame a mesma função em loop, uma semana por vez, e junte
// os PDFs com pdf-lib (merge) ou gere um Excel multi-abas (uma aba por semana).
