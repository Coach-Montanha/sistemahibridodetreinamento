# Plano de Reversão e Ajuste para Motor Híbrido

O usuário solicitou desfazer as últimas alterações (que focavam no motor de Musculação) para que possamos focar na correção do motor de **Treinamento Híbrido**.

## Alterações a serem desfeitas (Rollback)

Vou reverter as mudanças feitas nos arquivos de servidor da IA para limpar o estado antes de aplicarmos a lógica específica para o motor Híbrido.

### Arquivos e Linhas:
1.  **src/lib/prescricao-ia.server.ts**:
    *   Remover `molde?: any[]` da interface `RotinaContexto`.
    *   Remover a injeção do "MOLDE ESTRUTURAL" no prompt do usuário (linhas 98-99).
    *   (Opcional, mas recomendado para limpeza total) Reverter o `SYSTEM_PROMPT` que falava sobre Molde Estrutural genérico.

2.  **src/lib/prescricao-ia.functions.ts**:
    *   Remover `molde: z.array(z.any()).optional()` do validador `prescribeTrainingWithAi`.

## Próximos Passos (Ajuste para Híbrido)
Após a limpeza, apresentarei um novo plano focado exclusivamente em:
*   Garantir que o Motor Híbrido receba corretamente o molde da produção anterior.
*   Corrigir a falha de "IA não retornou sessão estruturada" especificamente para Híbrido/KB Fitness.

