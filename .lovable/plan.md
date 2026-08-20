# Plano de Otimização do Catálogo de Blocos, Formatos e Séries

Este plano visa unificar a fonte de verdade do sistema de prescrição, movendo as configurações do `localStorage` para o banco de dados (Supabase) e garantindo que o Construtor Manual, o Construtor de IA e o Motor Híbrido utilizem o mesmo catálogo.

## 1. Persistência Server-side (Supabase)
Mover as definições que hoje residem no `localStorage` para tabelas dedicadas:
- **`format_definitions`**: Formatos base (EMOM, AMRAP, etc.), nomes customizados, descrições e configurações padrão.
- **`set_type_definitions`**: Tipos de séries (Reps e Carga, Corrida, etc.) com seus campos e rótulos.
- **`block_templates`**: Atualizar para incluir ordem de exibição, origem (sistema/coach) e vínculo com a definição de formato.

## 2. Unificação dos Motores e Construtores
Refatorar o fluxo de dados para que todos os componentes consumam o catálogo do servidor:
- **Configurações**: Interface para CRUD de formatos e tipos de séries no Supabase.
- **SessionBuilder**: Carregar definições e presets do banco em vez do `localStorage`.
- **Construtor de Molde (IA)**: Utilizar os mesmos presets do banco, garantindo que a IA receba apenas formatos válidos.
- **Motor Híbrido**: Resolver IDs de presets para `base_format` canônico antes da geração.

## 3. Melhoria no Diagnóstico da IA
Melhorar as mensagens de erro quando a IA não encontra exercícios:
- Validar o pool de candidatos *antes* da chamada à API da IA.
- Exibir mensagens específicas indicando qual bloco falhou, quais filtros foram aplicados e quantos exercícios foram encontrados.

## Detalhes Técnicos
- **Migração SQL**: Já executada para as tabelas `format_definitions` e `set_type_definitions`.
- **Zod & Types**: Atualizar esquemas em `prescricao-ia.functions.ts` e `hibrido-gerar.functions.ts` para aceitar strings dinâmicas (presets) e validá-las contra o catálogo.
- **TanStack Query**: Implementar hooks para cache das definições no frontend com invalidação imediata após edições.
- **Compatibilidade**: Manter `generator_preferences` para parâmetros transitórios, mas usar `block_templates` como fonte primária de estrutura.
