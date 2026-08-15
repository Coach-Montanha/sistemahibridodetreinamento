# Evolução de Escola Metodológica na IA

Renomear "Metodologia" para "Escola Metodológica" no diálogo de prescrição via IA e permitir que a escolha da escola (ex: EXOS para CrossFit no Treinamento Funcional) seja persistida e influencie o motor de geração, mantendo a metodologia base do programa.

## Alterações Técnicas

- **Persistência de Escola**: Adicionar `escola_metodologica` ao objeto retornado pela IA e garantir que, ao salvar a sessão, essa informação seja armazenada (via metadados ou observações da sessão) para histórico futuro.
- **Frontend**:
    - Renomear rótulos de "Metodologia" para "Escola Metodológica" no `PrescreverIaDialog`.
    - Implementar dropdowns dinâmicos de escolas dependendo da metodologia base.
    - Adicionar estado `escola` no diálogo para capturar a escolha do usuário.
- **Motores de IA**:
    - Atualizar `prescricao-ia.functions.ts` para receber `escolaOverride`.
    - Injetar a escola selecionada nos prompts de sistema de cada modalidade (Musculação, Funcional, KB, WL, Corrida).
    - Ajustar prompts para que a IA adapte o vocabulário e a seleção de exercícios à escola escolhida.
- **UI**:
    - Atualizar `Badge` e resumos para refletir a "Escola" selecionada.
    - Melhorar o log de progresso para indicar a escola sendo aplicada.

## Detalhes por Modalidade

- **Treinamento Funcional**: EXOS, CrossFit, FMS, DNS, Boyle, Original Strength.
- **Levantamento de Peso**: Búlgara, Russa, Chinesa, Cubana, Colombiana, Pendlay, Takano.
- **Kettlebell Sport**: Fedorenko, Rudnev, Vorotyntsev, Denisov, Vasilev, Gomonov.
- **Corrida**: Daniels, Lydiard, Canova, Hansons, Pfitzinger, Horwill, Koop.
- **Musculação**: Bro-Split, Upper/Lower, PPL (Push/Pull/Legs), Full Body, Heavy Duty.
