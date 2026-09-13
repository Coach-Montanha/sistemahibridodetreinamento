import { test as base, Page } from "@playwright/test";

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/auth");
    
    // Preencher login se o formulário estiver visível
    const loginInput = page.getByTestId("input-login-email");
    if (await loginInput.isVisible().catch(() => false)) {
      await loginInput.fill("coach.montanha@example.com");
      await page.getByTestId("input-login-password").fill("SenhaSegura123!");
      await page.getByTestId("btn-submit-login").click();
      await page.waitForTimeout(1000);
    }
    
    await use(page);
  },
});

export { expect } from "@playwright/test";
