# Plano — Diagnóstico e Correção do Crash no Construtor de Moldes

O usuário reportou que ao clicar em **Adicionar bloco** no **Construtor de Molde** (`ConstrutorMoldeDialog.tsx`), a aplicação inteira trava com "This page didn't load". As tentativas anteriores de correção de normalização não resolveram. O objetivo é instrumentar o código para capturar o erro real e aplicar uma correção definitiva baseada no stack trace.

## 1. Instrumentação e Isolamento (Diagnóstico)

*   **Captura de Erros**: Adicionar um `ErrorBoundary` local e logs detalhados no `ConstrutorMoldeDialog.tsx` para interceptar a exceção antes que ela derrube a página inteira.
*   **Logs de Fluxo**: Inserir logs em `adicionarBloco`, `novoBloco`, `gerarChave` e no renderizador `BlocoCard`.
*   **Sanitização**: Garantir que nenhum dado sensível seja logado.

## 2. Hipóteses de Causa Raiz

1.  **Loop Infinito em `gerarChave`**: Se a lógica de chaves únicas falhar ao comparar formatos, pode entrar em loop.
2.  **Referência Circular ou Recursão**: Possível recursão no renderizador de blocos ao lidar com presets dinâmicos.
3.  **Erro de Hook/Estado**: Incompatibilidade de tipos ou valores `null`/`undefined` sendo passados para hooks do Shadcn (Select, Popover).
4.  **Zod Validation**: Falha ao validar o template da sessão no payload da IA.

## 3. Implementação da Solução

*   **Normalização de Tipos**: Garantir que `presetId` e `formato` sejam tratados consistentemente.
*   **Fallback Seguro**: Implementar um renderizador de fallback caso um bloco específico falhe.
*   **Refatoração de `novoBloco`**: Simplificar a lógica de inicialização para evitar estados inconsistentes.

## 4. Validação

*   Testar a adição de blocos embutidos (Mobilidade, EMOM).
*   Testar a adição de presets customizados.
*   Verificar a reordenação e exclusão de blocos após a correção.

## Detalhes Técnicos (para Desenvolvedores)

*   Arquivo Principal: `src/components/programa-ia/ConstrutorMoldeDialog.tsx`.
*   Dependências: `useFormatRegistry` de `src/lib/format-registry.ts`.
*   Atenção: A função `gerarChave` precisa ser robusta contra colisões de nomes e loops.
*   Atenção: O componente `Popover` pode estar perdendo o contexto se o estado for reiniciado abruptamente.
