# Plano de Auditoria e Deduplicação de Mídias

Este plano visa corrigir o fluxo de importação e correlação de mídias, garantindo que os GIFs sejam vinculados aos exercícios reais do catálogo traduzido e aprovado, além de implementar ferramentas para auditoria e deduplicação segura de arquivos no Storage.

## Ações imediatas

1. **Diagnóstico e Auditoria**: Implementar funções para identificar duplicidades e arquivos órfãos sem apagar nada automaticamente.
2. **Correção do Fluxo de Importação**: Impedir a criação de exercícios "fantasmas" (`[Pendente]`) e garantir vínculos determinísticos.
3. **Tradução em Massa Persistente**: Criar um sistema de jobs para tradução do catálogo que suporte pausa, retomada e grandes volumes.
4. **Reparação Histórica**: Vincular sessões que hoje usam placeholders aos exercícios reais equivalentes.

## Detalhes técnicos

### 1. Auditoria e Segurança
- Criar `buildMediaDuplicateReport` (Server Function): Percorre o Storage, calcula hashes e identifica duplicatas ou arquivos não referenciados.
- Criar `applyMediaDeduplication` (Server Function): Remove arquivos redundantes após confirmação, atualizando referências em `exercise_media` e sessões.

### 2. Importação e Correlação Determinística
- Refatorar `registerUploadedMedia`:
    - Remover criação de placeholders.
    - Status `needs_review` para arquivos sem correspondência exata.
    - Prioridade de match: `source_id` -> `catalog_id` -> `nome_pt` exato.
- Atualizar `startMediaInventory` e `applyAutoCorrelation` para serem idempotentes e usarem chaves lógicas `(exercise_id, storage_path)`.

### 3. Sistema de Tradução em Massa
- Implementar tabelas `exercise_translation_jobs` e `items`.
- Criar fluxo de processamento por lotes (10-25 itens) via IA, com salvamento do estado em `draft`.
- Interface com barra de progresso, logs de erro e botão de retomada.

### 4. Projeção e Uso nos Treinos
- Corrigir `projectApprovedExercises` para suportar paginação total.
- Atualizar `SessionBuilder` para carregar mídias via `exercise_id` e exibir alertas para exercícios não vinculados.
- Script `repairPendingExerciseLinks` para converter placeholders residuais em vínculos reais.

## Próximos passos
1. Migração de banco para novas tabelas de jobs e logs de auditoria.
2. Atualização das Server Functions de correlação e importação.
3. Implementação da nova interface de Tradução no Catálogo.
4. Execução do relatório de auditoria inicial (dry-run).
