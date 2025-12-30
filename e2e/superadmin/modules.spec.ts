import { test, expect } from '@playwright/test';

test.describe('SuperAdmin - Gestão de Módulos', () => {
  test.beforeEach(async ({ page }) => {
    // Login como superadmin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@medmanager.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/superadmin/dashboard');
  });

  test('deve navegar para tela de módulos', async ({ page }) => {
    await page.click('a[href="/superadmin/modules"]');
    await expect(page).toHaveURL('/superadmin/modules');
    await expect(page.locator('h1')).toContainText('Módulos');
  });

  test('deve listar todos os módulos', async ({ page }) => {
    await page.goto('/superadmin/modules');
    
    // Aguardar carregamento
    await page.waitForSelector('.module-card');
    
    // Verificar módulos principais
    await expect(page.locator('.module-card')).toContainText('NFe');
    await expect(page.locator('.module-card')).toContainText('SNGPC');
    await expect(page.locator('.module-card')).toContainText('PDV');
  });

  test('deve criar novo módulo', async ({ page }) => {
    await page.goto('/superadmin/modules');
    
    // Novo módulo
    await page.click('button:has-text("Novo Módulo")');
    
    // Preencher
    await page.fill('input[name="name"]', `Módulo Test ${Date.now()}`);
    await page.fill('input[name="code"]', `MOD_TEST_${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Módulo de testes');
    await page.fill('input[name="monthlyPrice"]', '49.90');
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve editar módulo', async ({ page }) => {
    await page.goto('/superadmin/modules');
    
    // Editar
    await page.click('.module-card:first-child button:has-text("Editar")');
    
    // Alterar descrição
    await page.fill('textarea[name="description"]', 'Descrição atualizada');
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve habilitar módulo para tenant', async ({ page }) => {
    await page.goto('/superadmin/modules');
    
    // Ver tenants do módulo
    await page.click('.module-card:first-child button:has-text("Gerenciar")');
    
    // Habilitar para tenant
    await page.click('.tenant-list tr:first-child .toggle-module');
    
    // Verificar
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve desabilitar módulo para tenant', async ({ page }) => {
    await page.goto('/superadmin/modules');
    
    // Ver tenants
    await page.click('.module-card:first-child button:has-text("Gerenciar")');
    
    // Desabilitar
    await page.click('.tenant-list tr:has(.badge-success):first-child .toggle-module');
    
    // Confirmar
    await page.click('button:has-text("Confirmar")');
    
    // Verificar
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve validar código único do módulo', async ({ page }) => {
    await page.goto('/superadmin/modules');
    
    // Novo módulo
    await page.click('button:has-text("Novo Módulo")');
    
    // Usar código existente
    await page.fill('input[name="code"]', 'NFE');
    await page.fill('input[name="name"]', 'Teste');
    
    // Tentar salvar
    await page.click('button[type="submit"]');
    
    // Verificar erro
    await expect(page.locator('.field-error')).toContainText('código já existe');
  });
});
