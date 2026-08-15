# Plano de Reconstrução: Layout de Imagem (Canvas Livre)

Este plano visa remover completamente o sistema de exportação atual e implementar um novo motor de "Canvas Livre" com arrastar e soltar (Drag & Drop), unificando a experiência em todo o sistema.

## 1. Limpeza e Reset (Fase "Terra Arrasada")
- **Limpar Dados**: Executar `resetarTodosOsLayouts()` para apagar qualquer configuração antiga de `localStorage`.
- **Remover UI Legada**: Excluir ou limpar referências ao `ExportImageDialog` (sessão) e `ProgramImageDialog` (programa) que utilizavam o layout de colunas fixas.
- **Simplificar Bibliotecas**: Remover heurísticas de distribuição automática de blocos em `session-image.ts` que não serão mais usadas.

## 2. Novo Motor de Canvas (Drag & Drop)
- **Implementar Draggable Blocks**: Transformar cada bloco de treino (Mobilidade, Aquecimento, Bloco Principal, etc.) em um elemento arrastável dentro de um canvas virtual.
- **Normalização de Coordenadas**: Armazenar a posição dos blocos em porcentagem (X%, Y%) para garantir que o layout funcione em diferentes formatos de tela (A4, Story, Post).
- **Interface de Edição**: Criar um editor onde o treinador pode:
    - Arrastar blocos para qualquer posição.
    - Redimensionar a largura dos blocos (colunas).
    - Alternar entre presets de tela mantendo a posição relativa dos elementos.

## 3. Unificação e Sincronização
- **Componente Único**: Criar o `UnifiedCanvasEditor` que será usado tanto na visualização de um Programa inteiro quanto na exportação de uma única Sessão.
- **Persistência Centralizada**: Salvar as coordenadas do layout no metadados do Programa/Sessão no banco de dados para que os "dois projetos" (toda a plataforma) funcionem exatamente iguais.

## Detalhes Técnicos
- **Biblioteca**: Uso de `@dnd-kit/core` para o arrasto e manipulação no canvas.
- **Renderização**: O motor de exportação usará as coordenadas salvas para desenhar no canvas de alta resolução (4K/8K) no momento do download.
- **Compatibilidade**: Garantir que todos os tipos de blocos e séries dinâmicos sejam suportados no novo canvas.
