# Plano de Tema Visual Pulse

Implementação de um novo sistema de temas extensível para o app Coach Montanha, introduzindo o tema "Pulse" com visual moderno, alto contraste e bordas arredondadas.

## Mudanças

### Core & Infraestrutura de Temas
- Criar `src/lib/theme.ts` e `src/lib/theme.functions.ts` para gerenciar a persistência do tema (localStorage + placeholders para banco).
- Adicionar `themeInitScript` em `src/routes/__root.tsx` para evitar o flash de tema no carregamento inicial.
- Definir tokens CSS do tema Pulse em `src/styles.css` sob o seletor `[data-tema="pulse"]`.

### UI & Componentes
- Criar `src/components/settings/aparencia-panel.tsx` com o seletor de temas (Padrão vs Pulse).
- Adicionar a nova seção "Aparência" em `src/routes/_authenticated/app.configuracoes.tsx`.
- Aplicar overrides globais de CSS para o tema Pulse:
  - Bordas arredondadas (32px) em cards.
  - Botões e badges em formato pílula.
  - Tipografia bold/black para métricas.
  - Anel primário em avatares.

### Persistência
- Salvar a preferência em `localStorage` como `visual-theme`.
- Aplicar a classe `dark` automaticamente quando o tema Pulse estiver ativo (pois ele é inerentemente escuro).

## Detalhes Técnicos
- O sistema utiliza o atributo `data-tema` no `<html>` para trocar os tokens CSS sem alterar a estrutura do React.
- O tema Pulse usa tons de preto (#0A0A0C) e cinzas profundos, com um laranja vibrante (#FF6B00) como cor primária.
- Nenhuma lógica de negócio, query ou API existente será modificada.
