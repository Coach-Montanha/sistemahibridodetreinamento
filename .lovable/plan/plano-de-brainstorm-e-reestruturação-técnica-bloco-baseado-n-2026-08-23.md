# Plano de Brainstorm e Reestruturação Técnica: Bloco Baseado no Tipo de Série

Implementar uma mudança fundamental na arquitetura do sistema, onde o **Tipo de Série** assume a governança técnica (campos, lógica de IA e cronômetro) e o **Formato de Bloco** torna-se um rótulo organizacional.

## User Review Required

> [!IMPORTANT]
> Esta mudança altera como a IA "pensa" sobre o seu treino. Em vez de gerar um bloco "Musculação", ela vai gerar um bloco de "Repetições e Carga". O nome "Musculação" vira um rótulo que você coloca por cima.

- **Hierarquia Invertida:** O Tipo de Série passa a ser obrigatório ao definir um Bloco.
- **IA Gramatical:** O motor de IA lerá os campos definidos no seu Tipo de Série dinâmico para saber o que preencher.
- **Migração:** Todos os seus blocos atuais serão vinculados automaticamente ao seu respectivo Tipo de Série técnico.

## Proposta Técnica

### 1. Reestruturação do Schema e Registros
- Modificar `FormatPreset` em `src/lib/format-registry.ts` para incluir `set_type_id` como campo obrigatório.
- Atualizar `BUILTIN_SET_TYPES` em `src/lib/set-type-registry.ts` para garantir que as bases técnicas estejam bem definidas.

### 2. Interface de Configuração (app.configuracoes.tsx)
- No `FormatoEditorDialog`, substituir o seletor de "Estrutura do Bloco" por um seletor de "Mecânica da Série" (Tipo de Série).
- A interface de "Valores Padrão" será gerada dinamicamente com base nos campos do Tipo de Série selecionado.

### 3. Construtor de Sessão (SessionBuilder)
- Refatorar `BlockCard.tsx` e `BlockFormats.tsx` para renderizar o formulário de entrada baseado no `set_type_id` do bloco, e não em um switch case fixo de formatos.
- Criar um componente `DynamicSetsEditor` que lê a definição do `set_type_registry` para montar os inputs.

### 4. Inteligência Artificial (IA Técnica)
- Atualizar os motores de IA (`prescricao-ia.server.ts` e `hibrido-ia.server.ts`) para injetar a definição técnica dos campos no prompt do sistema.
- A IA retornará um JSON onde as chaves correspondem exatamente aos IDs dos campos do Tipo de Série.

## Próximos Passos
1. Validar se a IA deve ter liberdade para mudar o Tipo de Série durante a geração ou se deve seguir estritamente o molde definido.
2. Executar a migração dos registros `builtin:` para a nova estrutura.
