# Plano de Edição em Massa de Exercícios

Implementar um sistema completo de edição em massa para o Banco de Exercícios, permitindo ajustar modalidades, equipamentos, padrões de movimento, exclusão e classificação de múltiplos exercícios simultaneamente.

## Alterações

### Frontend

- **Banco de Exercícios (`src/routes/_authenticated/app.exercicios.tsx`)**:
  - Expandir o `BulkEditDialog` para incluir novos campos:
    - Padrão de Movimento (Input de texto com modos de adição/substituição).
    - Unilateral (Toggle true/false/manter).
    - Ação de Exclusão (Botão de perigo com confirmação).
  - Aprimorar o modo de seleção:
    - Permitir "Selecionar Todos" filtrados vs "Selecionar Todos" do banco.
    - Melhorar o feedback visual de seleção nos cards.
  - Integrar a edição real dos componentes:
    - Garantir que a lógica de "Clone-on-Write" (para exercícios globais) seja transparente para o usuário durante a edição em massa.

### Backend (SQL)

- **Funções de Lote**:
  - Garantir que as operações de `INSERT` (para clones) e `UPDATE` (para itens próprios) em massa respeitem as restrições de integridade e RLS.

## Detalhes Técnicos

- Utilização de `Promise.all` com controle de concorrência (batches) para evitar timeouts em seleções muito grandes.
- Feedback de progresso em tempo real durante a execução das mutações.
- Invalidação global do cache do TanStack Query após a conclusão do lote.

## Considerações de Segurança

- Respeitar estritamente o `coach_id`. Exercícios globais (sem `coach_id`) nunca serão editados, apenas clonados para o catálogo do treinador se alterados.
- Ações destrutivas (exclusão em massa) terão confirmação dupla.
