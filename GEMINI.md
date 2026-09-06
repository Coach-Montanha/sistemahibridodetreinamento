# Diretrizes de Desenvolvimento — Coach Montanha

## Regras Mandatórias de Automação do Git (Auto-Push Automático)
- **Envio Automático ao GitHub**: Todas as alterações, adições de código, correções ou melhorias solicitadas devem ser automaticamente commitadas e enviadas (`git push origin main`) para o repositório remoto sem requerer aprovações prévias ou confirmações posteriores do usuário.
- **Fluxo Contínuo**:
  1. Integrar eventuais alterações remotas com `git pull --no-rebase`.
  2. Executar `git add .` e criar o commit com mensagem clara e semântica.
  3. Realizar `git push origin main` imediatamente ao concluir a tarefa.
- **Histórico Lovable**: O projeto está sincronizado com o Lovable. Nunca utilizar force-push (`--force`) ou rebase destrutivo em commits já publicados.

## Regras de Publicação Automática no Lovable
- **Auto-Publish Contínuo**: Qualquer modificação realizada no editor Lovable deve ser seguida da invocação imediata da ferramenta `publish`/`deploy` para refletir em `https://sistemahibridodetreinamento.lovable.app`.
