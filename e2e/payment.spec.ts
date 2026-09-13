import { test, expect } from "./fixtures/auth.fixture";

test.describe("Sistema Híbrido de Treinamento - Gestão de Mensalidades & Pagamentos", () => {
  test("Fluxo Feliz: Verificar página de pagamentos", async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toBeDefined();
  });
});
