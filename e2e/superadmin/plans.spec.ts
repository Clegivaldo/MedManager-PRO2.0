import { test, expect } from '@playwright/test';

test.describe('SuperAdmin - Gestão de Planos', () => {
  test.beforeEach(async ({ page }) => {
    // Login como superadmin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@medmanager.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/superadmin/dashboard');
  });

  test('deve navegar para tela de planos', async ({ page }) => {
    await page.click('a[href="/superadmin/plans"]');
    await expect(page).toHaveURL('/superadmin/plans');
    await expect(page.locator('h1')).toContainText('Planos');
  });

  test('deve listar planos existentes', async ({ page }) => {
    await page.goto('/superadmin/plans');
    
    // Aguardar carregamento
    await page.waitForSelector('.plan-card', { timeout: 5000 });
    
    // Verificar cards
    const cards = await page.locator('.plan-card').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('deve criar novo plano', async ({ page }) => {
    await page.goto('/superadmin/plans');
    
    // Clicar em Novo Plano
    await page.click('button:has-text("Novo Plano")');
    
    // Preencher formulário
    await page.fill('input[name="name"]', `Plano Test ${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Plano de testes automáticos');
    await page.fill('input[name="monthlyPrice"]', '199.90');
    await page.fill('input[name="yearlyPrice"]', '1999.00');
    await page.fill('input[name="maxUsers"]', '10');
    await page.fill('input[name="maxProducts"]', '1000');
    await page.fill('input[name="maxStorage"]', '5');
    
    // Habilitar recursos
    await page.check('input[name="features.nfe"]');
    await page.check('input[name="features.sngpc"]');
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar sucesso
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve editar plano existente', async ({ page }) => {
    await page.goto('/superadmin/plans');
    
    // Clicar em editar
    await page.click('.plan-card:first-child button:has-text("Editar")');
    
    // Alterar preço
    await page.fill('input[name="monthlyPrice"]', '299.90');
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar sucesso
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve ativar/desativar plano', async ({ page }) => {
    await page.goto('/superadmin/plans');
    
    // Toggle status
    await page.click('.plan-card:first-child .toggle-status');
    
    // Verificar mudança
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve visualizar detalhes do plano', async ({ page }) => {
    await page.goto('/superadmin/plans');
    
    // Clicar no plano
    await page.click('.plan-card:first-child .view-details');
    
    // Verificar modal
    await expect(page.locator('.modal-title')).toContainText('Detalhes do Plano');
    await expect(page.locator('.modal-body')).toContainText('Recursos Inclusos');
    await expect(page.locator('.modal-body')).toContainText('Limites');
  });

  test('deve validar preço negativo', async ({ page }) => {
    await page.goto('/superadmin/plans');
    
    await page.click('button:has-text("Novo Plano")');
    await page.fill('input[name="name"]', 'Plano Teste');
    await page.fill('input[name="monthlyPrice"]', '-100');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.field-error')).toContainText('deve ser positivo');
  });

  test('deve listar tenants do plano', async ({ page }) => {
    await page.goto('/superadmin/plans');
    
    // Ver tenants
    await page.click('.plan-card:first-child button:has-text("Ver Tenants")');
    
    // Verificar lista
    await expect(page.locator('.tenant-list')).toBeVisible();
  });
});
