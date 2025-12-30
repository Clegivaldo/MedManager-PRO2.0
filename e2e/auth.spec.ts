import { test, expect } from '@playwright/test';

/**
 * Testes E2E - Autenticação
 * Valida login, logout e proteção de rotas
 */

test.describe('Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Deve redirecionar para login quando não autenticado', async ({ page }) => {
    await expect(page).toHaveURL(/.*login/);
  });

  test('Deve fazer login com credenciais válidas (SuperAdmin)', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'admin@medmanager.com');
    await page.fill('input[name="password"]', 'admin123');
    
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    // Verificar se está na dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Verificar mensagem de erro
    const errorMessage = page.locator('text=/credenciais inválidas|email ou senha incorretos/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('Deve fazer logout com sucesso', async ({ page }) => {
    // Fazer login primeiro
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@medmanager.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
    // Fazer logout
    const userMenu = page.locator('[data-testid="user-menu"]').or(page.locator('button:has-text("admin")'));
    await userMenu.click();
    
    const logoutButton = page.locator('text=/sair|logout/i');
    await logoutButton.click();
    
    // Verificar se voltou para login
    await expect(page).toHaveURL(/.*login/);
  });

  test('Deve validar campos obrigatórios', async ({ page }) => {
    await page.goto('/login');
    
    // Tentar submeter sem preencher
    await page.click('button[type="submit"]');
    
    // Verificar mensagens de validação do navegador ou custom
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    // Pelo menos um dos campos deve ter indicação de erro
    const hasError = await emailInput.evaluate(el => !el.validity.valid) ||
                     await passwordInput.evaluate(el => !el.validity.valid);
    
    expect(hasError).toBeTruthy();
  });

  test('Deve persistir sessão após refresh', async ({ page }) => {
    // Fazer login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@medmanager.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
    // Fazer refresh
    await page.reload();
    
    // Verificar se ainda está autenticado (não voltou para login)
    await expect(page).not.toHaveURL(/.*login/);
  });
});
