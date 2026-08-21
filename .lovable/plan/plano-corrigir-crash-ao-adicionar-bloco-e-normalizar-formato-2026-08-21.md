# Plano - Corrigir Crash ao Adicionar Bloco e Normalizar Formatos

O objetivo é evitar que a aplicação trave ao adicionar novos blocos no construtor de moldes, garantindo que o ID do preset (`builtin:X` ou `custom:X`) seja convertido para o formato base canônico (`X`) antes de ser persistido ou enviado ao backend.

## User Review Required

> [!IMPORTANT]
> A implementação introduzirá uma separação clara entre `bloco.formato` (o tipo técnico reconhecido pelo motor de IA e banco) e `bloco.presetId` (a referência visual e de configuração inicial).

## Proposed Changes

### Normalização de Dados (Frontend)
- **Refatorar `novoBloco`**: A função em `ConstrutorMoldeDialog.tsx` passará a aceitar o objeto `FormatPreset` completo em vez de apenas o ID.
- **Camada de Tradução**: Garantir que `bloco.formato` receba sempre o `base_format` (ex: `amrap`), enquanto o ID original do preset é usado apenas para aplicar os defaults iniciais.
- **Tipo Seguro**: Atualizar as interfaces `BlocoTemplate` e `BlockFormatHibrido` para refletir que o formato deve ser o valor canônico.

### UI e UX (Construtor)
- **Menu de Seleção**: O popover de "Adicionar bloco" exibirá o label correto do preset, mas injetará a lógica normalizada.
- **Configuração de Bloco**: O seletor de formato dentro do card do bloco também deve suportar a troca de presets mantendo a integridade do formato base.

### Resiliência e IA
- **Payload do Backend**: Garantir que o `HibridoPayload` enviado para `onGerar` contenha apenas formatos válidos, evitando erros de validação Zod no servidor.
- **Registro de Formatos**: Garantir que o `useFormatRegistry` forneça acesso fácil ao `base_format` de qualquer preset.

## Technical Details

### Arquivo: `src/components/programa-ia/ConstrutorMoldeDialog.tsx`
- Alterar `adicionarBloco(formatoId: string)` para buscar o preset no registry e extrair o `base`.
- Atualizar `novoBloco` para aplicar `presets.defaults` se presentes.
- Ajustar `Select` de formato para mapear corretamente `value={preset.id}` e salvar `formato: preset.base`.

### Arquivo: `src/lib/hibrido-ia.server.ts`
- Verificar se `BlockFormatHibrido` está alinhado com os formatos suportados pelo motor de IA.
