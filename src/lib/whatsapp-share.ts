/**
 * Utilitário de formatação e compartilhamento de sessões e treinos via WhatsApp
 */

export interface WhatsAppSessionData {
  titulo: string;
  data?: string | null;
  metodologia?: string;
  coachNome?: string;
  blocos: Array<{
    titulo: string;
    formato?: string;
    exercicios: Array<{
      nome: string;
      series?: number | string | null;
      reps?: number | string | null;
      carga?: number | string | null;
      descanso?: number | string | null;
      observacoes?: string | null;
    }>;
  }>;
}

export function formatSessionForWhatsApp(session: WhatsAppSessionData, portalUrl?: string): string {
  const parts: string[] = [];

  parts.push(`🏋️ *TREINO: ${session.titulo.toUpperCase()}*`);
  if (session.metodologia) parts.push(`📌 *Modalidade:* ${session.metodologia}`);
  if (session.coachNome) parts.push(`👤 *Treinador:* ${session.coachNome}`);
  if (session.data) {
    const formattedDate = new Date(session.data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    parts.push(`📅 *Data:* ${formattedDate}`);
  }

  parts.push(`────────────────────`);

  for (const bloco of session.blocos) {
    parts.push(`\n🔹 *${bloco.titulo.toUpperCase()}*`);
    for (const ex of bloco.exercicios) {
      const details: string[] = [];
      if (ex.series && ex.reps) details.push(`${ex.series}x${ex.reps}`);
      else if (ex.series) details.push(`${ex.series} séries`);
      else if (ex.reps) details.push(`${ex.reps} reps`);

      if (ex.carga) details.push(`${ex.carga}kg`);
      if (ex.descanso) details.push(`descanso ${ex.descanso}s`);

      const detailStr = details.length > 0 ? ` (${details.join(" | ")})` : "";
      const obsStr = ex.observacoes ? ` _[${ex.observacoes}]_` : "";

      parts.push(`• *${ex.nome}*${detailStr}${obsStr}`);
    }
  }

  parts.push(`\n────────────────────`);
  if (portalUrl) {
    parts.push(`📱 *Acesse seu treino no portal:*`);
    parts.push(portalUrl);
  } else {
    parts.push(`💪 _Bons treinos! Foque na técnica e consistência._`);
  }

  return parts.join("\n");
}

export function openWhatsAppShare(text: string, phone?: string) {
  const encoded = encodeURIComponent(text);
  const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, "_blank", "noopener,noreferrer");
}
