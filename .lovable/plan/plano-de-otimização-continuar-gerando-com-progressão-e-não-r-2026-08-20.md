# Plano de Otimização: Continuar Gerando com Progressão e Não Repetição

Este plano visa unificar e otimizar a funcionalidade de "Continuar Gerando" para todas as modalidades, resolvendo os erros de contexto longo e garantindo uma progressão lógica e programática.

## 1. Infraestrutura e Camada de Servidor

- **Criar `src/lib/continuation.server.ts`**: Centralizar a lógica de extração de histórico.
    - `buildContinuationContext`: Função que busca as últimas $N$ sessões e gera um resumo estruturado (IDs usados, frequência, padrões de movimento, grupos musculares).
    - Identificação de "Âncoras": Exercícios que devem permanecer (fundamentais) vs exercícios para rotação.
- **Atualizar `prescricao-ia.server.ts`**: 
    - Integrar o novo contexto de continuidade.
    - Refinar o `SYSTEM_PROMPT` para Musculação, focando em periodização ondulatória e leitura do contexto estruturado.
    - Implementar diferenciação fina de erros do Gateway (400 vs 429 vs 500).

## 2. Motores Específicos (Híbrido e Kettlebell)

- **Refatorar `hibrido-ia.server.ts`**:
    - Substituir a serialização JSON bruta pelo resumo do `ContinuationContext`.
    - Implementar a lógica de `softAvoid` programática: se a IA sugerir um exercício em cooldown, o validador tenta substituir por outro do pool antes de aceitar a repetição.
    - Garantir que blocos de mobilidade/aquecimento mantenham sua integridade técnica.

## 3. Interface (Frontend)

- **Atualizar `PrescreverIaDialog.tsx`**:
    - Novos controles:
        - **Análise de Histórico** (0 a 12 sessões).
        - **Janela de Cooldown** (0 a 6 sessões).
        - **Intensidade da Evolução** (Peso no relatório de evolução).
    - Exibição clara da **Escola Metodológica** selecionada.
    - Feedback de erro aprimorado: exibir causas específicas (Pool Vazio, Limite de IA, etc).
- **Ajustar `app.programas.tsx`**:
    - Corrigir a passagem de dados para o diálogo ao clicar em "Continuar Gerando", garantindo que o `historicoSessoes` seja passado corretamente.

## 4. Segurança e Validação

- Garantir que as consultas de histórico respeitem o `coach_id` via RLS.
- Validar todos os novos inputs via Zod no `prescricao-ia.functions.ts`.

## Detalhes Técnicos

```text
ContinuationContext {
  recentExerciseIds: string[],
  usageFrequency: Record<string, number>,
  lastSeenSession: Record<string, number>,
  muscleGroupBalance: Record<string, number>,
  cooldownBlockedIds: string[],
  progressionNotes: string
}
```

O histórico passará de ~12.000 caracteres para menos de 2.000, eliminando erros 400.
