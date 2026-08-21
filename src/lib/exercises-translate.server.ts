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
  const { callLovableAiJson } = await import("./ai-gateway.server");

  const texto = (v: unknown, max = 4000) => {
    if (v == null) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.slice(0, max);
  };

  const prompt = `
Traduza o seguinte exercício:
Nome Original: ${texto(exercise.name_original, 300)}
Categoria: ${texto(exercise.category, 200)}
Parte do Corpo: ${texto(exercise.body_part, 200)}
Equipamento: ${texto(exercise.equipment_original, 200)}
Alvo: ${texto(exercise.target, 200)}
Grupo Muscular: ${texto(exercise.muscle_group, 200)}
Músculos Secundários: ${texto(exercise.secondary_muscles, 600)}
Instruções (EN): ${texto(exercise.instructions, 4000)}
Passos (EN): ${texto(exercise.instruction_steps, 4000)}
  `.trim();

  const { json } = await callLovableAiJson<any>({
    scope: "traducao-catalogo",
    system: SYSTEM_PROMPT_TRANSLATION,
    prompt,
    temperature: 0.1,
  });

  if (!json || typeof json.name !== "string" || json.name.trim().length === 0) {
    throw new Error("A IA não retornou um nome traduzido válido.");
  }

  json.equipment = normalizarEquipamento(json.equipment) || "Objetos Alternativos";
  return json;
}


/**
 * Tradutor específico para o Catálogo de Exercícios.
 */
export async function translateCatalogWithAI(exercise: any) {
  return translateExercise(exercise);
}
