# Plano de Correção e Assertividade da Geração Automática

O Coach relatou que os blocos configurados na aba "Geração Automática" não persistem (voltam ao estado anterior após F5) e que, ao gerar treinos, o sistema não utiliza a estrutura definida, exigindo inserção manual. O objetivo é garantir a persistência real no banco de dados e a sincronização automática entre a configuração e o motor de IA.

## 1. Persistência de Dados (Configurações)
- **Investigar a causa da "não persistência"**: O `ConfiguracoesPage` utiliza a `saveGeneratorPrefs` (via `generator_preferences`).
- **Verificar RLS**: Garantir que as tabelas `generator_preferences` e `block_templates` tenham permissões corretas para o `coach_id`.
- **Validar Payload**: No `onSave` da página de configurações, verificar se o payload enviado à server function está completo e se não há erros silenciosos de validação (Zod).

## 2. Assertividade do Motor de Geração
- **Sincronização com IA**: No motor Híbrido (`prescricao-ia.functions.ts`), a IA deve ler prioritariamente as `generator_preferences` do treinador para a modalidade ativa.
- **Fallbacks Inteligentes**: Se o treinador configurou blocos específicos para "Treinamento Híbrido", o `PrescreverIaDialog` deve carregar esses blocos por padrão no `sessaoTemplate` inicial.
- **Eliminação de Ação Manual**: Ajustar o `PrescreverIaDialog` para que, ao abrir, ele já venha preenchido com a estrutura configurada nas preferências, eliminando a necessidade de o coach "montar" o treino manualmente antes de disparar a IA.

## Detalhes Técnicos
- **Tabela `generator_preferences`**: É o ponto central. Devemos garantir que o motor de IA (`prescricao-ia.server.ts`) utilize a estrutura de `blocos` definida nesta tabela como base para o prompt do Gemini.
- **Schema Validation**: Atualizar o Zod em `generator-prefs.functions.ts` para incluir novos metadados de presets (labels customizados, set types) se estiverem faltando, evitando que o banco ignore campos novos.
- **Pre-loading no Dialog**: No `PrescreverIaDialog.tsx`, adicionar um `useEffect` que consulte as preferências da modalidade selecionada e popule o `hibridoPayload` automaticamente.

## Próximos Passos
1. Executar testes de RLS e validação de schema na tabela `generator_preferences`.
2. Corrigir o fluxo de salvamento no frontend para garantir feedback visual de erro se a persistência falhar.
3. Integrar as preferências configuradas diretamente no início do fluxo de geração por IA.
