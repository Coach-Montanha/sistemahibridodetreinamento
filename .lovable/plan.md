# Plano de Correção: Erro de Carregamento e Configuração do Motor Híbrido

O erro "This page didn't load" geralmente indica uma falha crítica no lado do servidor ou durante a renderização (SSR). No contexto do motor híbrido, identificamos que a transição entre a criação do programa e a geração das sessões pode estar falhando devido a estados inconsistentes ou dados ausentes durante a progressão.

## Ações Planejadas

### 1. Robustez na Recuperação da Última Sessão
Ajustar o `prescribeTrainingWithAi` em `src/lib/prescricao-ia.functions.ts` para lidar melhor com programas recém-criados que ainda não possuem semanas ou sessões, evitando erros de desreferenciamento que quebram o carregamento da página.

### 2. Correção de Erros de Parâmetros no Dialog
Verificar se o `PrescreverIaDialog.tsx` está recebendo todos os dados necessários antes de disparar a mutação, especialmente em fluxos de "Novo Planejamento" onde o `escopo` ou a `metodologia` podem estar nulos.

### 3. Melhoria na Mensagem de Erro de Configuração
Substituir erros genéricos que causam falhas de carregamento por mensagens de UI amigáveis, informando ao usuário exatamente o que falta configurar no molde.

## Detalhes Técnicos
- Adicionar verificações de `null/undefined` ao acessar `programa.program_weeks` e `ultimaSessao.session_blocks`.
- Garantir que `molde.length === 0` lance um erro capturável pelo `onError` da mutação, em vez de um erro não tratado no handler do servidor.
- Ajustar o fluxo em `app.gerar.tsx` para garantir que o objeto `programa` passado para o dialog contenha a `metodologia` correta.
