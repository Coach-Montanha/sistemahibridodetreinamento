# Plano de Remoção e Reinicialização da Estrutura de Layout de Imagem

Este plano descreve a remoção completa da estrutura atual de layout de imagem customizado (posicionamento X/Y, spans de coluna, presets) para permitir uma reconstrução do zero baseada em um modelo de Canvas Livre (Drag & Drop).

## Ações Realizadas

### 1. Limpeza de Dados e Tipos
- **Remover** as propriedades de posicionamento manual (`posicoesBlocos`, `x`, `y`, `largura`, `altura`) do tipo `ImageLayout` em `src/lib/program-image-layout.ts`.
- **Simplificar** o `ImageLayout` para conter apenas metadados básicos (dimensões, fundo) enquanto a nova estrutura não é definida.
- **Remover** as funções de persistência de layout (`salvarLayout`, `carregarLayout`) que utilizam o esquema antigo no `localStorage`.

### 2. Remoção da Interface de Edição
- **Remover** o componente `LayoutEditor` (`src/components/program-image/layout-editor.tsx`).
- **Remover** diálogos e botões relacionados ao "Layout de imagem" nas telas de Programas e Sessões (ex: `PosicionarBlocosDialog`).

### 3. Simplificação do Motor de Exportação
- **Limpar** a lógica de renderização em `src/lib/image-export.ts` e `src/lib/session-image.ts`.
- O motor voltará temporariamente a um estado "estático" básico (ou será limpo para reescrita total) para evitar erros de referência a campos removidos.
- **Remover** o suporte a `posicoesBlocos` na montagem do input de imagem em `src/lib/session-image.ts`.

## Detalhes Técnicos

### Arquivos Afetados:
- `src/lib/program-image-layout.ts`: Redução do schema e remoção de presets obsoletos.
- `src/lib/session-image.ts`: Remoção da lógica `usaPosicaoManual` e `mapaPosicoes`.
- `src/lib/image-export.ts`: Remoção do bloco `if (temPosicoesManuais)` e simplificação da geometria.
- `src/components/program-image/layout-editor.tsx`: Exclusão do arquivo.

### Observação de Segurança:
- O reset será total, limpando todos os `localStorage` relacionados a `program-image-layout:*`.

---
**Deseja prosseguir com a remoção total da estrutura para iniciarmos a reconstrução do zero?**
