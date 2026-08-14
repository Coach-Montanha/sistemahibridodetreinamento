# Plano de Ação: Refatoração do Motor de IA e Layout de Imagem (Híbrido/KB Fitness)

O usuário relatou falhas no "Organizar Layout da Imagem", na produção de texto/layout e na "Prescrever com IA" (progressão continuada). O objetivo é limpar as implementações problemáticas e reconstruir do zero seguindo as novas diretrizes.

## 1. Limpeza e Simplificação (Reset)
Remover lógicas complexas e redundantes que tentam automatizar demais o posicionamento ou a análise de histórico, voltando a um estado funcional e previsível.

### IA e Progressão (Híbrido/KB Fitness)
- **Motor de IA**: Refatorar `prescribeTrainingWithAi` em `src/lib/prescricao-ia.functions.ts` para focar estritamente em **Variação de Exercícios (Novo Treino)** conforme solicitado.
- **Histórico**: Simplificar a análise de histórico para apenas extrair nomes de exercícios usados recentemente para instruir a IA a evitá-los (evitar payload de memória gigante).
- **Moldes**: Garantir que o molde (template) seja sempre respeitado e que a IA apenas preencha os slots de exercícios.

### Layout de Imagem (Canvas Livre)
- **Posicionamento**: Abandonar a lógica de "Zonas" rígidas (Esquerda vs Principal) que causa sobreposição.
- **Canvas Livre**: Reimplementar o `PosicionarBlocosDialog.tsx` e o `ExportImageDialog.tsx` para focar em coordenadas X/Y reais salvas no `program-image-layout.ts`.
- **Renderização**: Ajustar `image-export.ts` para que, se houver coordenadas manuais, elas tenham prioridade total sobre qualquer layout automático.

## 2. Implementação da Interface (UI)
- **Prescrever com IA**: Atualizar o `PrescreverIaDialog.tsx` para refletir o novo escopo de "Novo Treino/Variação".
- **Organizar Layout**: Refinar a interface de arraste no Canvas para ser intuitiva (Canvas Livre).

## Detalhes Técnicos
- **Zustand/Storage**: Limpar `localStorage` de layouts antigos para evitar conflitos de dados corrompidos.
- **Dnd-kit**: Garantir que o arraste no Canvas atualize as coordenadas X/Y normalizadas (0 a 1) para funcionar em qualquer resolução de exportação.
- **Gemini (IA)**: Ajustar os system prompts em `hibrido-ia.server.ts` para serem mais incisivos na escolha de exercícios variados da biblioteca.

Este plano foca na estabilidade e na entrega exata do comportamento de "Canvas Livre" e "IA de Variação" solicitado.
