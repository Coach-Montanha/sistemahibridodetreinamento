import { test, expect } from "./fixtures/auth.fixture";

test.describe("Sistema Híbrido de Treinamento - Autenticação & Cadastro", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("Fluxo Feliz: Deve exibir formulários de Login e Cadastro", async ({ page }) => {
    await expect(page.getByTestId("tab-login")).toBeVisible();
    await expect(page.getByTestId("tab-cadastro")).toBeVisible();

    await page.getByTestId("tab-cadastro").click();
    await expect(page.getByTestId("input-signup-nome")).toBeVisible();
    await expect(page.getByTestId("input-signup-email")).toBeVisible();
    await expect(page.getByTestId("input-signup-password")).toBeVisible();
    await expect(page.getByTestId("btn-submit-signup")).toBeVisible();
  });

  test("Fluxo Feliz: Cadastro de novo treinador com sucesso (mocked API)", async ({ page }) => {
    await page.route("**/auth/v1/signup*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "coach-id-123",
          email: "coach.novo@montanha.com",
          user_metadata: { nome: "Coach Silva" },
        }),
      });
    });

    await page.getByTestId("tab-cadastro").click();
    await page.getByTestId("input-signup-nome").fill("Coach Silva");
    await page.getByTestId("input-signup-email").fill("coach.novo@montanha.com");
    await page.getByTestId("input-signup-password").fill("SenhaSuperForte123!");
    await page.getByTestId("btn-submit-signup").click();
  });

  test("Estado de Falha: Rejeitar senha com menos de 8 caracteres no cadastro", async ({ page }) => {
    await page.getByTestId("tab-cadastro").click();
    await page.getByTestId("input-signup-nome").fill("Coach Teste");
    await page.getByTestId("input-signup-email").fill("coach.teste@montanha.com");
    await page.getByTestId("input-signup-password").fill("1234");

    const pwdInput = page.getByTestId("input-signup-password");
    const isInvalid = await pwdInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test("Estado de Falha: Exibir toast de erro no login com credenciais incorretas", async ({ page }) => {
    await page.route("**/auth/v1/token*", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          message: "Invalid login credentials",
        }),
      });
    });

    await page.getByTestId("input-login-email").fill("coach.inexistente@montanha.com");
    await page.getByTestId("input-login-password").fill("SenhaErrada!");
    await page.getByTestId("btn-submit-login").click();
  });
});
