# Plano de Integração do Catálogo Externo de Exercícios

Este plano descreve a integração segura do repositório `exercises-dataset` ao sistema, expandindo a biblioteca global sem comprometer a estabilidade atual.

## Objetivos
- Integrar 1.324 exercícios do dataset GitHub (Commit: `fe2e63a4a2cbf634c88e38644ec86068d9127735`).
- Implementar arquitetura de duas camadas para revisão segura antes da publicação.
- Mapear equipamentos para o vocabulário canônico e a nova categoria "Alternativos Musculação".

## Alterações Propostas

### 1. Banco de Dados (Supabase)
- **Migration**:
  - Criar tabela `public.exercise_catalog` para armazenar o JSON bruto normalizado, commit SHA e metadados de atribuição.
  - Adicionar colunas de rastreabilidade (`source`, `source_id`, `source_commit`) na tabela `public.exercises`.
  - Configurar RLS: Somente administradores (service_role) podem escrever no catálogo; leitura via RLS para auditagem.
  - GRANTs explícitos para garantir acesso às novas tabelas.

### 2. Backend (Server Functions)
- **Importador (`src/lib/exercises-import.server.ts`)**:
  - Função server-side idempotente para baixar o JSON versionado.
  - Processamento em lotes (250 registros) para evitar estouro de memória/timeout.
  - Normalização determinística:
    - Nomes e Instruções (Português/Inglês).
    - Equipamentos: Mapear `cable`, `machine`, `plate` para "Alternativos Musculação".
    - `body weight` -> "Ginásticos".
- **Projetor**:
  - Lógica para mover registros de `exercise_catalog` (se `approved_for_projection = true`) para `exercises` com `coach_id = NULL`.

### 3. Frontend (Interface Administrativa)
- **Área de Configurações**:
  - Adicionar aba "Catálogo Externo".
  - Botão "Sincronizar Dataset" (Dry-run inicial com relatório de contagens).
  - Listagem de exercícios do catálogo com status de revisão.

### 4. Mídia e Licença
- **Importante**: Mídia (GIFs/Imagens) NÃO será importada nesta fase, conforme solicitado.
- Preservação do aviso de copyright e licença MIT no catálogo.

## Detalhes Técnicos
- **SHA**: `fe2e63a4a2cbf634c88e38644ec86068d9127735`
- **URL**: `https://raw.githubusercontent.com/Coach-Montanha/exercises-dataset/fe2e63a4a2cbf634c88e38644ec86068d9127735/data/exercises.json`
- **Equipamentos Canônicos**: Kettlebell, Ginásticos, Dumbbell, Barbell, Mobilidade, Objetos Alternativos, Alternativos Musculação.

## Verificação e Testes
- Build e Lint.
- Dry-run da importação reportando volume de dados.
- Teste de idempotência (executar 2x sem duplicar).
- Verificação do motor Híbrido: Exercícios projetados devem aparecer no pool de candidatos.
- Verificação Kettlebell Fitness: Exercícios "Alternativos Musculação" não devem ser confundidos com Kettlebells.
