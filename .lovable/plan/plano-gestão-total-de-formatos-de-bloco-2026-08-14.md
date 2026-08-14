# Plano: Gestão Total de Formatos de Bloco

Permitir que o Coach Montanha tenha controle absoluto sobre a biblioteca de blocos de treinamento, podendo criar, editar e excluir qualquer formato (incluindo os padrões do sistema), garantindo que a IA respeite essas customizações.

## Mudanças Técnicas

### 1. Banco de Dados e API
- Garantir que a tabela `block_formats` permita operações de escrita (CRUD) para o usuário autenticado.
- Adicionar uma flag `is_custom` ou similar se necessário para distinguir, mas permitir edição em todos.
- Criar funções de servidor para gerenciar a persistência dessas customizações.

### 2. Interface de Gestão Global
- Criar/Melhorar a página de **Configurações > Formatos de Bloco**.
- Implementar um editor visual para definir:
  - Nome do bloco (ex: "Mobilidade", "MetCon", "Desafio do Montanha").
  - Identificador único (`chave`).
  - Campos padrão (Séries, Repetições, Carga, etc.).
  - Metadados de comportamento (ex: se é um bloco de 'preparação' ou 'principal').

### 3. Integração com Construtor de Sessão
- O menu "Adicionar Bloco" no `SessionBuilder` deve ser populado dinamicamente a partir da tabela `block_formats` do banco de dados, em vez de usar uma lista estática.
- Remover restrições de "apenas leitura" para blocos padrão.

### 4. Inteligência Artificial
- Atualizar os motores de IA (`prescricao-ia`, `hibrido-ia`) para ler os formatos disponíveis no banco de dados do usuário antes de gerar o prompt.
- Instruir a IA a utilizar as estruturas definidas nos formatos customizados.

## Detalhes de Implementação
- **Frontend**: Componente `BlockFormatsEditor` para gerenciar a lista global.
- **Backend**: RLS atualizado para `block_formats` permitindo `ALL` para o `authenticated` (dono).
- **Consistência**: Garantir que ao excluir um formato, os treinos existentes que o utilizam não quebrem (soft-delete ou aviso).

O objetivo é transformar o sistema de blocos de "estático" para "dinâmico e orientado ao banco de dados".