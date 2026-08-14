# Evolução de Programação e Metodologia Flexível na IA

Este plano aborda a correção da detecção de metodologia no motor de IA (ex: Funcional sendo detectado como Musculação), a implementação de um prompt interativo no modal "Continuar Gerando" para permitir personalização total (metodologia, escopo, instruções específicas) e a evolução baseada em histórico e limitações do aluno.

## Mudanças

### Backend (Server Functions & IA)
- **Ajuste de Contexto na IA**: Atualizar o prompt do Gemini para priorizar o histórico completo, incluindo limitações e observações de saúde do aluno capturadas em gerações anteriores.
- **Normalização de Metodologia**: Garantir que o payload enviado à IA contenha a metodologia correta (Funcional, Híbrido, etc.) e que o motor responda com a nomenclatura e blocos adequados àquela metodologia.
- **Expansão do Prompt Híbrido**: Incluir no prompt do motor híbrido/fitness as "instruções do treinador" com peso maior, permitindo que a IA ajuste a complexidade técnica e carga conforme solicitado.

### Frontend (UI & UX)
- **Refatoração do PrescreverIaDialog**:
    - Adicionar um seletor de Metodologia manual para permitir que o treinador altere a direção da evolução (ex: evoluir um treino funcional para algo mais híbrido).
    - Implementar campos de escopo dinâmicos (Número de Semanas e Dias por Semana).
    - Adicionar o campo de "Instruções Específicas" no modal de continuação.
    - Corrigir a Badge de metodologia no topo do diálogo para refletir a escolha atual ou a detectada.
- **Log de Progresso**: Melhorar o feedback visual durante a geração ("Analisando limites do aluno...", "Projetando progressão ondulatória...").

## Detalhes Técnicos
- Mapeamento explícito das metodologias dinâmicas no registry de tipos de séries e formatos de bloco para a IA.
- Sincronização de metadados de programas (regras de progressão) para persistir o histórico de prompts e respostas da IA.
- Garantia de que blocos customizados criados pelo usuário sejam injetados corretamente no contexto da IA.

## Verificação
- Testar a geração de continuação em um programa de "Treinamento Funcional" e validar se a Badge e o conteúdo gerado seguem a metodologia.
- Validar se a IA respeita o comando de gerar 4 semanas (24 treinos se 6x/sem) em vez de apenas uma sessão.
- Confirmar se as limitações físicas do aluno mencionadas no início do programa são respeitadas na evolução.
