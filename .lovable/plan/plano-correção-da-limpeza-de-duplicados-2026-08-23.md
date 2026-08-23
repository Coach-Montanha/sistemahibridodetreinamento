# Plano: Correção da Limpeza de Duplicados

O usuário relatou que não consegue selecionar nem apagar exercícios na tela de limpeza de duplicados. A análise do código identificou que as ações estão bloqueadas por uma verificação de segurança excessivamente restritiva que impede qualquer ação em exercícios que não possuem um `coach_id` (exercícios globais), mesmo que o objetivo seja fundi-los em um exercício próprio ou removê-los do catálogo pessoal.

## Alterações

### Frontend

- **Ajustar lógica de bloqueio na `DuplicadosPage` (`src/routes/_authenticated/app.exercicios.duplicados.tsx`):**
    - Permitir que exercícios globais sejam usados como "base" (Manter e Fundir) se houver duplicatas pessoais no grupo.
    - Habilitar o botão de exclusão para exercícios pessoais (com `coach_id`) que são duplicatas de globais.
    - Garantir que o estado visual reflita corretamente quais itens podem ser manipulados.

- **Melhorar Feedback Visual:**
    - Adicionar estados de carregamento individuais nos botões para evitar cliques duplos.
    - Melhorar as mensagens de confirmação para serem mais claras sobre o que está sendo mantido e o que está sendo fundido/excluído.

### Backend (Verificação)

- A função SQL `merge_exercises` já deve lidar com a lógica de permissão (garantindo que um coach só apague ou altere o que lhe pertence ou referências para o que lhe pertence). Nenhuma alteração de schema é prevista, apenas ajuste na camada de UI para permitir a interação.

## Detalhes Técnicos

- Alterar a condição `!isGlobal` nos botões da `DuplicadosPage`.
- A lógica de `merge_exercises` no Supabase será validada via código para garantir que ela aceite um `keeper_id` global contanto que os `duplicate_ids` sejam do coach atual, permitindo a "limpeza" do banco pessoal em favor do catálogo global.
