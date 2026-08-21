# Plano: Correção do Catálogo IA e Estabilização da IA de Prescrição

Este plano visa corrigir as falhas críticas no Catálogo de Exercícios (botão salvar/aprovar sem efeito) e prevenir falhas que derrubam a aplicação durante a geração de treinos ("This page didn't load").

## Problema A: Catálogo IA - Salvar e Aprovar
O diagnóstico indica que a UI não reflete o sucesso das operações porque as mutations em `CatalogReviewList.tsx` não tratam adequadamente os estados e a sincronização com o banco.

### Ações
- **Contrato Único no Servidor**: Criar/Ajustar `saveCatalogTranslationDraft` e `approveCatalogTranslation` em `src/lib/exercises-import.functions.ts` como `createServerFn` autenticadas.
- **Robustez nas Mutations**: Refatorar `CatalogReviewList.tsx` para usar estas funções e garantir que `await` seja respeitado, capturando erros do Supabase/RLS e exibindo Toasts precisos.
- **Sincronização de Estado**: Garantir que após aprovação, a UI recarregue os dados e mostre o status `Aprovado` corretamente.

## Problema B: "Continuar Gerando" Derruba a Página
Atualmente, qualquer erro não capturado no `PrescreverIaDialog.tsx` ou no servidor sobe até o `ErrorBoundary` da raiz, resultando em uma tela branca.

### Ações
- **Tratamento Local de Erros**: Envolver a lógica de `gerarMut` em blocos `try/catch` robustos e exibir erros no diálogo, sem disparar a falha da rota.
- **Tipagem de Erros de IA**: Melhorar a captura de erros do AI Gateway (limite de tokens, timeout) para que o usuário saiba o motivo exato (ex: "Contexto muito longo").
- **Proteção de Renderização**: Garantir que se a IA retornar um JSON inválido, a UI não quebre ao tentar mapear os campos.

## Detalhes Técnicos
- Uso de `supabaseAdmin` em funções críticas de catálogo para garantir consistência em operações de aprovação massiva.
- Atualização para o modelo `google/gemini-2.5-flash` em todos os pontos restantes para consistência de performance.
- Inclusão de `sonner` toasts para feedback visual imediato em todas as operações de backend.
