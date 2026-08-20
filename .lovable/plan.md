# Plan: Integração e Tradução Integral do Dataset para PT-BR

Implementar a arquitetura de tradução e curadoria para o catálogo de exercícios, garantindo que o sistema opere 100% em português brasileiro, mantendo a fonte original para auditoria.

## User Review Required

> [!IMPORTANT]
> A tradução será feita via IA (Gemini 2.0 Flash) em lotes server-side.
> O processo de "Projeção" (criação do exercício na biblioteca ativa) só ocorrerá após a tradução ser marcada como `approved`.

## Proposed Changes

### Database (Supabase)

#### [New Table] `public.exercise_catalog_translations`
- Armazena as traduções vinculadas a `exercise_catalog.id`.
- Campos: `name_pt_br`, `category_pt_br`, `body_part_pt_br`, `equipment_pt_br`, `target_pt_br`, `muscle_group_pt_br`, `secondary_muscles_pt_br`, `instructions_pt_br`, `instruction_steps_pt_br`.
- Metadados: `status` (pending, draft, approved), `source` (llm, human), `model_version`.

#### [Update Table] `public.exercise_catalog`
- Remover colunas de tradução temporárias se existirem.
- Garantir que a projeção aponte para a tradução aprovada.

### Backend (Server Functions)

#### `src/lib/exercises-import.functions.ts`
- **`translateCatalogBatch`**: Nova função que pega itens `pending` de tradução, chama o AI Gateway e salva rascunhos.
- **`projectApprovedExercises`**: Atualizar para usar os campos traduzidos da `exercise_catalog_translations` ao criar registros em `public.exercises`.

#### `src/lib/exercises-translate.server.ts`
- Lógica de prompt especializada para tradução técnica de bodybuilding/fitness.
- Garantir mapeamento canônico de equipamentos (ex: "cable" -> "Alternativos Musculação").

### Frontend (Admin/Settings)

#### `src/components/exercises/CatalogReviewList.tsx`
- Adicionar interface de comparação lado a lado (Inglês vs Português).
- Permitir edição manual da tradução antes da aprovação.
- Botão "Traduzir via IA" para disparar o job em lote.

#### `src/components/exercises/ExerciseImportManager.tsx`
- Adicionar progresso de tradução nas estatísticas.

## Technical Details

- **Tradução em Lote**: Lotes de 5-10 exercícios por vez para evitar timeouts e limites de token.
- **Mapeamento de Equipamento**: Seguir rigorosamente o de-para:
  - kettlebell -> Kettlebell
  - barbell -> Barbell
  - dumbbell -> Dumbbell
  - body weight -> Ginásticos
  - cable/machine/plate -> Alternativos Musculação
- **Consistência**: O prompt de tradução incluirá a lista de equipamentos e metodologias canônicas do sistema.

## Verification Plan

### Manual Verification
1. Acessar Configurações > Catálogo IA.
2. Disparar Sincronização GitHub (SHA `fe2e63a4a2cbf634c88e38644ec86068d9127735`).
3. Disparar Tradução em Lote.
4. Revisar um exercício (comparar EN vs PT).
5. Editar e Aprovar.
6. Projetar e verificar se o exercício apareceu no Banco de Exercícios com nome em PT e equipamento correto.

### Automated Tests
- Validar se a tradução mantém o número exato de `instruction_steps`.
- Validar se o mapeamento de equipamentos falha para termos desconhecidos.
