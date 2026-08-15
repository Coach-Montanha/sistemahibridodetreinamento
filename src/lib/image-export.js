const FONT_FAMILY = "Poppins";
function desenharColuna(ctx, blocos, x, yInicial, largura, escala, corTexto, corMuted, layout) {
    let y = yInicial;
    const tituloSize = 44 * escala;
    const linhaSize = 34 * escala;
    for (const b of blocos) {
        // Se houver posição customizada, usamos ela.
        // A chave do bloco é essencial aqui.
        let drawX = x;
        let drawY = y;
        let drawW = largura;
        const pos = b.chave ? layout.posicoes?.[b.chave] : null;
        if (pos) {
            drawX = (pos.x / 100) * ctx.canvas.width;
            drawY = (pos.y / 100) * ctx.canvas.height;
            drawW = (pos.w / 100) * ctx.canvas.width;
        }
        ctx.fillStyle = corTexto;
        ctx.font = `800 ${tituloSize}px "${FONT_FAMILY}", sans-serif`;
        ctx.fillText(b.titulo ?? "", drawX, drawY, drawW);
        let currentY = drawY + tituloSize * 1.35;
        if (b.subtitulo) {
            ctx.fillStyle = corMuted;
            ctx.font = `600 ${linhaSize}px "${FONT_FAMILY}", sans-serif`;
            ctx.fillText(b.subtitulo, drawX, currentY, drawW);
            currentY += linhaSize * 1.4;
        }
        ctx.fillStyle = corTexto;
        ctx.font = `400 ${linhaSize}px "${FONT_FAMILY}", sans-serif`;
        for (const l of b.linhas) {
            ctx.fillText(l.texto, drawX, currentY, drawW);
            currentY += linhaSize * 1.35;
        }
        // Se não for posicionado manualmente, atualiza o y global para o próximo bloco automático
        if (!pos) {
            y = currentY + tituloSize * 0.8;
        }
    }
}
export async function renderizarSessaoCanvas(input) {
    const L = input.layout ?? { largura: 5760, altura: 2160, fundo: "claro" };
    const canvas = document.createElement("canvas");
    canvas.width = L.largura;
    canvas.height = L.altura;
    const ctx = canvas.getContext("2d");
    const escuro = L.fundo === "escuro";
    const corFundo = input.corFundo ?? (escuro ? "#0F1115" : "#FFFFFF");
    const corTexto = input.corTexto ?? (escuro ? "#F5F5F4" : "#0F1115");
    const corMuted = input.corMuted ?? (escuro ? "#9CA3AF" : "#6B7280");
    if (L.fundo !== "transparente") {
        ctx.fillStyle = corFundo;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.textBaseline = "top";
    const escala = canvas.height / 2160;
    const margem = 140 * escala;
    const temEsquerda = input.esquerda.length > 0;
    const larguraEsq = temEsquerda ? (canvas.width - margem * 3) * 0.3 : 0;
    const larguraPrin = canvas.width - margem * (temEsquerda ? 3 : 2) - larguraEsq;
    ctx.fillStyle = corTexto;
    ctx.font = `900 ${90 * escala}px "${FONT_FAMILY}", sans-serif`;
    ctx.fillText(input.metodologiaLabel, margem, margem);
    const topo = margem + 160 * escala;
    if (temEsquerda) {
        desenharColuna(ctx, input.esquerda, margem, topo, larguraEsq, escala, corTexto, corMuted, L);
    }
    desenharColuna(ctx, input.principal, margem + (temEsquerda ? larguraEsq + margem : 0), topo, larguraPrin, escala, corTexto, corMuted, L);
    ctx.fillStyle = corMuted;
    ctx.font = `600 ${40 * escala}px "${FONT_FAMILY}", sans-serif`;
    ctx.fillText(input.coachLabel, margem, canvas.height - margem);
    return canvas;
}
export async function renderizarPreviewDataURL(input, targetWidth = 1280) {
    const big = await renderizarSessaoCanvas(input);
    const scale = targetWidth / big.width;
    const small = document.createElement("canvas");
    small.width = targetWidth;
    small.height = Math.round(big.height * scale);
    const ctx = small.getContext("2d");
    ctx.drawImage(big, 0, 0, small.width, small.height);
    return small.toDataURL("image/png");
}
async function canvasParaBlob(canvas, formato) {
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), formato === "jpg" ? "image/jpeg" : "image/png", 0.95));
}
function baixarBlob(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
}
export async function exportarSessaoImagem(input, nomeArquivo, formato = "png") {
    const canvas = await renderizarSessaoCanvas(input);
    baixarBlob(await canvasParaBlob(canvas, formato), `${nomeArquivo}.${formato}`);
}
/** Exporta várias sessões como um único ZIP de imagens. */
export async function exportarSessoesEmMassa(itens, formato, nomeZip) {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const item of itens) {
        const canvas = await renderizarSessaoCanvas(item.input);
        const blob = await canvasParaBlob(canvas, formato);
        zip.file(`${item.nomeArquivo}.${formato}`, blob);
    }
    baixarBlob(await zip.generateAsync({ type: "blob" }), nomeZip);
}
/** Exporta várias sessões num PDF único (uma página por sessão). */
export async function exportarSessoesPDF(itens, nomeArquivo) {
    const { jsPDF } = await import("jspdf");
    let pdf = null;
    for (const item of itens) {
        const canvas = await renderizarSessaoCanvas(item.input);
        const orientacao = canvas.width >= canvas.height ? "landscape" : "portrait";
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        if (!pdf) {
            pdf = new jsPDF({
                orientation: orientacao,
                unit: "px",
                format: [canvas.width, canvas.height],
            });
        }
        else {
            pdf.addPage([canvas.width, canvas.height], orientacao);
        }
        pdf.addImage(dataUrl, "JPEG", 0, 0, canvas.width, canvas.height);
    }
    if (pdf)
        pdf.save(nomeArquivo);
}
