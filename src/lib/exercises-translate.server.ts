import { EQUIPAMENTOS_CANONICOS, normalizarEquipamento } from "./hibrido-ia.server";

export const SYSTEM_PROMPT_TRANSLATION = `
Você é um tradutor técnico especialista em fisiculturismo, treinamento funcional e anatomia.
Sua tarefa é traduzir exercícios do inglês para o português brasileiro (pt-BR).

REGRAS DE TRADUÇÃO:
1. NOME: Traduza para o nome comum usado em academias no Brasil (ex: "Bench Press" -> "Supino Reto"). Se não houver tradução comum, use uma tradução descritiva técnica.
2. EQUIPAMENTO: Mapeie estritamente para um dos seguintes valores canônicos:
   - kettlebell -> Kettlebell
   - barbell -> Barbell
   - dumbbell -> Dumbbell
   - body weight -> Ginásticos
   - cable -> Alternativos Musculação
   - machine -> Alternativos Musculação
   - plate -> Alternativos Musculação
   - Se o equipamento não estiver na lista, tente encontrar o mais próximo ou use "Objetos Alternativos".
3. INSTRUÇÕES: Traduza o texto mantendo o tom profissional e instrutivo.
4. PASSOS (Steps): Mantenha a ordem e a quantidade exata de passos.
5. TERMOS TÉCNICOS:
   - "Core" -> "Core" ou "Centro do corpo"
   - "Sets" -> "Séries"
   - "Reps" -> "Repetições"
   - "Grip" -> "Pegada"
   - "Stance" -> "Postura" ou "Base"

FORMATO DE RETORNO (JSON):
{
  "name": "Nome em Português",
  "category": "Categoria em Português",
  "body_part": "Parte do corpo",
  "equipment": "Equipamento Canônico",
  "target": "Músculo alvo",
  "muscle_group": "Grupo muscular",
  "secondary_muscles": ["Músculo 1", "Músculo 2"],
  "instructions": "Texto completo das instruções",
  "instruction_steps": ["Passo 1", "Passo 2", "..."]
}
`;

export async function translateExercise(exercise: any) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Serviço de IA indisponível no momento");

  const prompt = `
Traduza o seguinte exercício:
Nome Original: ${exercise.name_original}
Categoria: ${exercise.category}
Parte do Corpo: ${exercise.body_part}
Equipamento: ${exercise.equipment_original}
Alvo: ${exercise.target}
Grupo Muscular: ${exercise.muscle_group}
Músculos Secundários: ${JSON.stringify(exercise.secondary_muscles)}
Instruções (EN): ${JSON.stringify(exercise.instructions)}
Passos (EN): ${JSON.stringify(exercise.instruction_steps)}
  `;

  // Gemini 2.0 Flash é o modelo recomendado por estabilidade e custo/performance
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_TRANSLATION },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    console.error(`AI gateway translation error [${res.status}]:`, corpo);
    
    // Tratamento de erro 400 específico para ajudar no diagnóstico
    if (res.status === 400) {
      throw new Error(`Falha na tradução via IA (erro 400): O Gateway rejeitou o request. Verifique o conteúdo do exercício ou o modelo.`);
    }
    
    throw new Error(`Falha na tradução via IA (erro ${res.status})`);
  }

  const payload: any = await res.json();
  const conteudo = payload?.choices?.[0]?.message?.content;

  if (typeof conteudo !== "string" || conteudo.trim().length === 0) {
    throw new Error("A IA não retornou conteúdo. Tente novamente.");
  }

  try {
    const result = JSON.parse(conteudo);
    
    // Validação extra de equipamento
    result.equipment = normalizarEquipamento(result.equipment) || "Objetos Alternativos";
    
    return result;
  } catch (err) {
    console.error("Erro ao processar JSON da IA:", conteudo);
    throw new Error("Resposta da IA inválida");
  }
}

/**
 * Tradutor específico para o Catálogo de Exercícios.
 */
export async function translateCatalogWithAI(exercise: any) {
  return translateExercise(exercise);
}
