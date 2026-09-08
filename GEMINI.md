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

## Skills Estratégicas & Servidor MCP AAS
- **Skills Locais Integradas** em `.agents/skills/`:
  - `e2e-testing-patterns`: Padrões e playbooks para testes ponta a ponta com Playwright.
  - `mobile-design`: Princípios mobile-first, touch-first e comportamento de aplicativo nativo.
  - `accessibility-compliance-accessibility-audit`: Diretrizes WCAG 2.2 AA e auditoria de acessibilidade.
  - `stripe-integration`: Arquitetura de pagamentos, checkout e webhooks resilientes.
- **Servidor MCP AAS Local**: O ambiente de desenvolvimento conta com o servidor MCP do AAS Core v2.0 (`aas-core` e `aas-catalog`), permitindo busca, leitura e instalação sob demanda de mais de 2.100 skills especializadas.

