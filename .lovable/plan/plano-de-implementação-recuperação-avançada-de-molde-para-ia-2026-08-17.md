# Plano de Implementação: Recuperação Avançada de Molde para IA

Aprimorar o motor de geração Híbrido/Kettlebell Fitness para que, ao continuar um programa, ele ofereça a escolha de moldes baseados na "Produção Completa" (histórico) e garanta a troca obrigatória de exercícios para progressão técnica.

## Alterações Propostas

### 1. Refatoração da Extração de Molde no Frontend
- Modificar `src/routes/_authenticated/app.programas.tsx` para extrair não apenas a última sessão, mas um **mapa de moldes únicos** encontrados em todo o programa.
- Se houver múltiplos moldes divergentes, o sistema abrirá um seletor para o usuário escolher qual estrutura deseja replicar na nova fase.

### 2. Interface de Seleção de Molde
- Adicionar ao `PrescreverIaDialog.tsx` (ou componente auxiliar) a capacidade de visualizar e selecionar qual das estruturas históricas será usada como `sessaoTemplate`.

### 3. Ajuste no Prompt do Motor Híbrido
- Atualizar `src/lib/hibrido-ia.server.ts` para reforçar a **Troca Obrigatória** de exercícios.
- Incluir no prompt instruções explícitas para que a IA descarte os exercícios usados na fase anterior (passados no `resumoAnterior`) e selecione novos candidatos do pool, mantendo o rigor do molde.

### 4. Robustez na API de Geração
- Garantir que o payload enviado para `prescribeTrainingWithAi` contenha o `hibrido.sessaoTemplate` escolhido pelo usuário, evitando falhas de "molde vazio".

## Detalhes Técnicos
- **Filtro de Histórico**: A extração percorrerá `program_weeks` -> `sessions` -> `session_blocks`.
- **Deduplicação de Estruturas**: Blocos serão comparados por `formato`, `numeroExercicios` e `modoExecucao` para identificar moldes repetidos.
- **Prompt IA**: Adição de cláusula `DO NOT REPEAT`: "Você deve selecionar novos IDs de exercícios para esta fase, garantindo evolução técnica e evitando repetição monótona dos movimentos realizados anteriormente."

Este plano resolve a "Recuperação Automática" limitada e dá controle ao Coach sobre qual fase do programa ele deseja evoluir.