# Plano de Correções: Roteamento, Hidratação e Preview

Este plano visa corrigir três problemas técnicos específicos no projeto, garantindo estabilidade no roteamento de autenticação, eliminando avisos de hidratação no React e alinhando o script de preview com o ambiente de build.

## Alterações Técnicas

### 1. Correção da rota `/auth/primeiro-acesso`
- **Arquivo**: `src/routes/auth.tsx`
- **Ação**: Refatorar o componente `AuthPage` para atuar como um layout condicional.
- **Lógica**: Utilizar `useRouterState` para verificar se o `pathname` é exatamente `/auth`. Se for, renderiza o formulário de Login/Cadastro. Se for uma sub-rota (como `/auth/primeiro-acesso`), renderiza `<Outlet />`.

### 2. Correção de Warnings de Hidratação
- **Arquivo**: `src/routes/__root.tsx`
  - Adicionar `suppressHydrationWarning` à tag `<html>`.
  - Alterar `lang="en"` para `lang="pt-BR"`.
- **Arquivos**: `src/routes/index.tsx` e `src/routes/auth.tsx`
  - Garantir IDs estáveis nos componentes `TabsTrigger` e `TabsContent` do Radix UI.
  - Substituir `onValueChange={(v) => setTab(v as any)}` por uma validação explícita de tipo para evitar erros de casting.

### 3. Correção do script de Preview
- **Arquivo**: `package.json`
- **Ação**: Atualizar o script `"preview"` de `"vite preview"` para `"nitro preview"`, alinhando-o com o output do build (Nitro).

## Processo de Validação
- **Tipagem**: Executar `tsc --noEmit`.
- **Lint**: Validar arquivos modificados.
- **Build**: Confirmar que `pnpm build` (ou equivalente) finaliza sem erros.
- **Runtime**: Testar acessibilidade das rotas `/auth` e `/auth/primeiro-acesso` no preview.

Não serão alteradas lógicas de negócio, banco de dados ou segredos.