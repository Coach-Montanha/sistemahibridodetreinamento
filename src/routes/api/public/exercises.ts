import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/exercises")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/public-api.server");
        return preflight();
      },
      GET: async ({ request }) => {
        const { requireApiKey, json, errorResponse } = await import(
          "@/lib/public-api.server"
        );
        try {
          // Embora o Banco de Exercícios não seja estritamente privado por coach_id
          // (existem exercícios globais), exigimos a API Key para rastreabilidade
          // e para garantir que apenas projetos autorizados acessem.
          await requireApiKey(request);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          const url = new URL(request.url);
          const q = url.searchParams.get("q");
          const methodology = url.searchParams.get("methodology");
          const equipment = url.searchParams.get("equipment");

          let query = supabaseAdmin
            .from("exercises")
            .select(`
              id, 
              nome_pt, 
              nome_en, 
              instrucoes, 
              metodologias, 
              equipamento,
              exercise_media(*)
            `)
            .order("nome_pt");

          if (q) query = query.ilike("nome_pt", `%${q}%`);
          if (methodology) query = query.contains("metodologias", [methodology]);
          if (equipment) query = query.contains("equipamento", [equipment]);

          const { data, error } = await query;
          if (error) throw error;

          return json({
            data: (data ?? []).map((ex) => {
              return {
                id: ex.id,
                name: ex.nome_pt,
                name_en: ex.nome_en,
                description: ex.instrucoes,
                methodologies: ex.metodologias,
                equipment: ex.equipamento,
                media: (ex.exercise_media ?? []).map((m: any) => ({
                  url: m.url_publica,
                  type: m.storage_path?.startsWith("youtube-") ? "youtube" : m.tipo,
                })),
              };
            }),
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
