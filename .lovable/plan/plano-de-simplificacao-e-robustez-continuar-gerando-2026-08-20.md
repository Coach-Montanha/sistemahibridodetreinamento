# Plano de Simplificacao e Robustez: "Continuar Gerando"

O objetivo e resolver o erro "Historico muito longo para a IA" e tornar a funcionalidade "Continuar Gerando" mais confiavel, reutilizando parametros salvos e limitando o contexto enviado a IA para o essencial.

## Acoes Imediatas
- Migrar para uma arquitetura de "Perfil de Geracao" persistido no banco de dados.
- Implementar a funcao server-side `getRecentExerciseUsage` para extracao compacta de historico.
- Criar a funcao `getContinuationCandidates` para selecao inteligente de exercicios sem repeticao excessiva.
- Reduzir drasticamente o payload enviado a IA, substituindo o JSON bruto por um contexto resumido.

## Alteracoes Tecnicas

### 1. Banco de Dados (Supabase)
- Adicionar a coluna `regras_progressao` (JSONB) na tabela `programs` (se nao existir) para salvar o perfil de geracao `{ metodologia, escola, dias_por_semana, molde, equipamentos, objetivo, restricoes, instrucoes, set_types }`.

### 2. Infraestrutura Server-side (`src/lib/continuation.server.ts`)
- Implementar `getRecentExerciseUsage(programId, sessionLimit = 3)`: retorna IDs e nomes dos exercicios usados recentemente.
- Implementar `getContinuationCandidates(...)`: busca exercicios na biblioteca, filtra bloqueados/recentes e ordena por menor uso.

### 3. Motores de IA (`src/lib/*-ia.server.ts`)
- Refatorar `montar*Prompt` para aceitar o novo contexto simplificado.
- Remover o envio de `resumoAnterior` (JSON gigante) e substituir por `ContinuationContext` curto.
- Garantir que a IA receba apenas nomes e IDs limitados (max 30-50).

### 4. Logic de Negocio (`src/lib/prescricao-ia.functions.ts`)
- Atualizar `prescribeTrainingWithAi` para:
    1. Carregar/Salvar o perfil de geracao no programa.
    2. Chamar `buildContinuationContext` com `cooldown=3`.
    3. Para Hibrido, usar `getContinuationCandidates` para preencher o molde antes da IA ou passar como pool filtrado.
    4. Tratar erros de forma granulada (nao apenas "Historico muito longo").

### 5. Interface (`src/components/programa-ia/PrescreverIaDialog.tsx`)
- Mover o controle de "Historico considerado" para "Opcoes Avancadas" (limitado a 0-6).
- Adicionar aviso "Rotacao automatica baseada nos ultimos 3 treinos".
- Carregar automaticamente os parametros do programa ao abrir em modo continuacao.

### 6. Protecao contra Duplicidade
- Implementar um `request_hash` ou verificar a ultima semana criada para evitar criacao duplicada em retries.

## Testes de Validacao
- Confirmar que 1 semana/3 dias gera 3 sessoes.
- Verificar que a IA nao recebe o JSON completo das sessoes anteriores.
- Validar se exercicios das ultimas 3 sessoes sao evitados.
- Garantir que nenhum treino anterior e apagado ou sobrescrito.
