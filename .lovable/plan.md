# Plano de Unificação Técnica: Presets e Mecânicas de Série

O objetivo é integrar totalmente o sistema de **Presets de Bloco** com a governança dos **Tipos de Série**, eliminando a confusão entre termos (como "Estações" vs "Séries/Rounds") e garantindo que todas as opções estruturais estejam disponíveis de forma coerente no construtor de moldes e nas configurações.

## Mudanças Propostas

### 1. Reestruturação do Registro de Formatos (`src/lib/format-registry.ts`)
- Refatorar o `FormatPreset` para que suporte a configuração manual de visibilidade de campos, baseada no `set_type_id`.
- Adicionar metadados para mapear a nomenclatura contextual (ex: se o preset for funcional, usar "Rounds"; se for musculação, usar "Séries").

### 2. Evolução do Editor de Formatos (`app.configuracoes.tsx`)
- Atualizar o `FormatoEditorDialog` para exibir dinamicamente os campos do `SetType` selecionado.
- Permitir que o coach escolha quais campos são "Padrão" para aquele preset específico (ex: um preset de Aquecimento pode ocultar "Carga" e focar em "Tempo").

### 3. Sincronização no Construtor de Moldes (`ConstrutorMoldeDialog.tsx`)
- Unificar os seletores: ao escolher um preset no molde, a UI deve carregar exatamente os campos configurados no editor, respeitando a nomenclatura contextualizada (Manual/Configurável).
- Implementar o "Reset para Padrão" ao trocar de formato/preset para evitar conflitos de dados de tipos diferentes.

### 4. Ajustes no Motor de IA
- Instruir os prompts da IA a respeitarem a configuração `set_type_id` de cada bloco para gerar valores gramaticalmente corretos para cada campo técnico.

## Detalhes Técnicos

- **Mapeamento de Nomenclatura**: Criar um helper `getLabelForField(field, context)` que retorne "Rounds" para circuitos e "Séries" para musculação.
- **Persistência**: Os campos manuais serão salvos no JSON `default_config` da tabela `format_definitions`.
- **Validação**: Garantir que o `set_type_id` seja obrigatório em todo preset customizado.

```text
Hierarquia Final:
[Tipo de Série (Gramática)] -> [Preset de Bloco (Configuração Manual)] -> [Construtor de Molde (Aplicação)]
```

Deseja prosseguir com essa implementação?
