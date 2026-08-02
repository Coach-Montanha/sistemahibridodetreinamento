import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SYSTEM_PROMPT,
  calcularDataFim,
  detectarNomenclatura,
  mensagemDeErroGateway,
  montarUserPrompt,
  normalizarPrescricao,
  type AiPrescription,
} from "@/lib/prescricao-ia.server";

const INPUT = z.object({
  programId: z.string().uuid(),
  prompt: z.string().max(4000).default(""),
  diasPorSemana: z.number().int().min(1).max(7).nullable().optional(),
  escopoLabel: z.string().max(80).nullable().optional(),
});

export const prescribeTrainingWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => INPUT.parse(input))
  .handler(async ({ data, context }): Promise<AiPrescription> => {
    // Motor dedicado: NÃO consulta a tabela `exercises`. Os movimentos vêm
    // exclusivamente do modelo, evitando mistura com outras modalidades.
    const supabase = context.supabase;

    const { data: programa, error } = await supabase
      .from("programs")
      .select(
        "id, titulo, metodologia, descricao, data_inicio, duracao_semanas, program_weeks(sessions(titulo))",
      )
      .eq("id", data.programId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!programa) throw new Error("Programa não encontrado ou sem permissão de acesso");
    if (programa.metodologia !== "musculacao") {
      throw new Error(
        "Prescrever com IA está disponível apenas para a modalidade Musculação",
      );
    }

    const titulos: (string | null)[] = ((programa as any).program_weeks ?? []).flatMap(
      (w: any) => (w.sessions ?? []).map((s: any) => s.titulo ?? null),
    );

    const ctx = {
      titulo: programa.titulo ?? "Programa",
      duracao_semanas: programa.duracao_semanas ?? 1,
      data_inicio: programa.data_inicio ?? null,
      data_fim: calcularDataFim(programa.data_inicio ?? null, programa.duracao_semanas ?? 1),
      nomenclatura: detectarNomenclatura(titulos),
      sessoes_existentes: titulos.length,
      objetivos: programa.descricao ?? null,
      dias_por_semana: data.diasPorSemana ?? null,
      escopo_label: data.escopoLabel ?? null,
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA indisponível no momento");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: montarUserPrompt(ctx, data.prompt) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error(`AI gateway [${res.status}]: ${corpo}`);
      throw new Error(mensagemDeErroGateway(res.status));
    }

    const payload: any = await res.json();
    const conteudo = payload?.choices?.[0]?.message?.content;
    if (typeof conteudo !== "string" || conteudo.trim().length === 0) {
      throw new Error("A IA não retornou conteúdo. Tente novamente.");
    }

    return normalizarPrescricao(conteudo);
  });
