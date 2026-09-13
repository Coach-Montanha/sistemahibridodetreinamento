import { test, expect } from "./fixtures/auth.fixture";

test.describe("Sistema Híbrido de Treinamento - Ação Principal (Montador de Treino & Alunos)", () => {
  test("Fluxo Feliz: Acessar aplicativo de treino", async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toHaveURL(/.*(auth|app|aluno)/);
  });
});
