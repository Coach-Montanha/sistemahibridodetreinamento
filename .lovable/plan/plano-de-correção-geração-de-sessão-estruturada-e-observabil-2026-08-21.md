# Plano de Correção: Geração de Sessão Estruturada e Observabilidade

O sistema apresenta erro "A IA não retornou nenhuma sessão estruturada" mesmo quando há candidatos disponíveis. O plano foca em instrumentar a comunicação com a IA, validar rigorosamente o contrato de resposta e garantir fallbacks seguros.

## Ações imediatas

1. **Instrumentação e Logs de Diagnóstico**
   - Implementar registro de telemetria no `prescricao-ia.functions.ts` capturando: modelo solicitado/usado, status HTTP, e amostra da resposta bruta.
   - Distinguir erros de infraestrutura (Gateway) de erros de lógica (JSON inválido ou schema incompatível).

2. **Reforço do Motor Híbrido**
   - Corrigir a validação do pool no `hibrido-ia.server.ts` para não lançar erro genérico quando o pool existe mas a IA falha no preenchimento.
   - Garantir que `normalizarPrescricaoHibrido` recupere blocos incompletos usando candidatos válidos do pool (Deduplicação e Fallback determinístico).

3. **Correção de Modelo e Estabilidade**
   - Substituir IDs de modelos Gemini hardcoded pela chamada dinâmica `getBestAvailableModel`.
   - Ajustar o `response_format` e prompts para maximizar a aderência ao JSON estruturado.

## Detalhes técnicos

- **Telemetria**: Adicionar logs estruturados em `src/lib/prescricao-ia.functions.ts` antes e depois da chamada ao Gateway do Lovable.
- **Validação de ID**: O `normalizarPrescricaoHibrido` será atualizado para validar cada ID retornado contra o pool real de exercícios, evitando alucinações.
- **Fallback**: Caso a IA retorne uma lista vazia ou inválida para um bloco, o sistema preencherá automaticamente com os exercícios mais relevantes do pool de candidatos.
- **Identificadores de Erro**: Mapear falhas para códigos claros: `AI_GATEWAY_ERROR`, `AI_EMPTY_CONTENT`, `AI_SCHEMA_MISMATCH`.

## Verificação

- Testar fluxo "Continuar gerando" em rotinas Híbridas.
- Validar se o log do servidor mostra a resposta bruta da IA em caso de falha de parsing.
- Confirmar que o sistema não "trava" mais na mensagem de pool vazio quando há candidatos.
