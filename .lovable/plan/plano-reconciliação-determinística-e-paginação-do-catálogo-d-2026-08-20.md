# Plano: Reconciliação Determinística e Paginação do Catálogo de Exercícios

O objetivo é garantir que 100% dos exercícios do repositório `exercises-dataset` sejam importados, traduzidos e exibidos corretamente, corrigindo o limite atual de 1.000 registros causado por restrições de consulta no Supabase e na interface.

## Diagnóstico
- **Causa do limite:** O PostgREST (Supabase) tem um limite padrão de 1.000 registros por consulta. O código atual em `CatalogReviewList.tsx` faz uma busca única sem paginação.
- **Estado atual:** O banco já possui 1.324 registros, confirmando que a importação server-side funcionou, mas a visualização e os processos dependentes (como tradução) estão limitados pela falta de paginação.

## Ações Técnicas

### 1. Banco de Dados e Backend
- **Paginação no Catálogo:** Atualizar `translateCatalogBatch` para buscar exercícios além do primeiro lote de 1.000 usando offset/limit.
- **Paginação na Projeção:** Atualizar `projectApprovedExercises` para garantir que todos os aprovados sejam processados, independente da quantidade.

### 2. Interface (Frontend)
- **Visualização Paginada:** Implementar paginação real no componente `CatalogReviewList.tsx` para permitir navegar por todos os 1.324+ exercícios.
- **Relatório de Reconciliação:** Adicionar um sumário no `ExerciseImportManager.tsx` comparando o JSON da fonte (dinâmico) com os totais no banco.

### 3. Processo de Reconciliação
- **Validação de IDs:** Criar uma função de diagnóstico que compare `source_exercise_id` do JSON com os registros no banco para identificar lacunas.
- **SHA Dinâmico:** Garantir que o `expected_total` seja calculado via `allExercises.length` do JSON remoto.

## Plano de Execução

1.  **Refatorar `CatalogReviewList.tsx`:** Adicionar controles de paginação (Next/Prev) e suporte a `.range()` na query do Supabase.
2.  **Atualizar `ExerciseImportManager.tsx`:** Melhorar os cards de estatísticas para mostrar "Faltantes" (Baseado no JSON remoto).
3.  **Otimizar `exercises-import.functions.ts`:** Garantir que buscas por "candidatos à tradução" ou "aprovados para projeção" não fiquem presas nos primeiros 1.000 registros.
4.  **Relatório Final:** Gerar o log detalhado exigido com SHA, IDs faltantes e confirmação de integridade.

Não haverá `delete all`. Todo o trabalho de tradução já realizado será preservado via `upsert` por `(source, source_exercise_id)`.
