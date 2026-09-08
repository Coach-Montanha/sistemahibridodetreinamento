<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Regras Mandatórias de Automação do Git (Auto-Push Automático)
- **Envio Automático ao GitHub**: Todas as alterações, adições de código, correções ou melhorias solicitadas devem ser automaticamente commitadas e enviadas (`git push origin main`) para o repositório remoto sem requerer aprovações prévias ou confirmações posteriores do usuário.
- **Fluxo Contínuo**:
  1. Integrar eventuais alterações remotas com `git pull --no-rebase`.
  2. Executar `git add .` e criar o commit com mensagem clara e semântica.
  3. Realizar `git push origin main` imediatamente ao concluir a tarefa.
- **Histórico Lovable**: Nunca utilizar force-push (`--force`) ou rebase destrutivo em commits já publicados.

## Regras Mandatórias para o Agente Lovable (Publicação Automática)
- **Auto-Publish Obrigatório**: Sempre que concluir qualquer instrução, alteração de código, correção ou melhoria executada dentro do Lovable, o agente do Lovable DEVE invocar a ferramenta de publicação (`publish` / `deploy`) imediatamente para atualizar o app em produção (`https://sistemahibridodetreinamento.lovable.app`) sem aguardar confirmações manuais do usuário.
- **Auto-Approve da Ferramenta Publish**: A ferramenta de publicação deve ser configurada como "Always allow" (Sempre permitir) nas permissões de ferramentas do projeto para que a publicação ocorra de forma fluida e instantânea.

## Skills Estratégicas & Servidor MCP AAS
- **Skills Locais Integradas** em `.agents/skills/`:
  - `e2e-testing-patterns`: Padrões e playbooks para testes ponta a ponta com Playwright.
  - `mobile-design`: Princípios mobile-first, touch-first e comportamento de aplicativo nativo.
  - `accessibility-compliance-accessibility-audit`: Diretrizes WCAG 2.2 AA e auditoria de acessibilidade.
  - `stripe-integration`: Arquitetura de pagamentos, checkout e webhooks resilientes.
- **Servidor MCP AAS Local**: O ambiente de desenvolvimento conta com o servidor MCP do AAS Core v2.0 (`aas-core` e `aas-catalog`), permitindo busca, leitura e instalação sob demanda de mais de 2.100 skills especializadas.


