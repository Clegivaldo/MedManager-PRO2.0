import { test, expect } from '@playwright/test';

test.describe('SuperAdmin - Dashboard e Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Login como superadmin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@medmanager.com.br');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/superadmin/dashboard');
  });

  test('deve exibir dashboard principal', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    
    // Verificar título
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verificar cards de métricas
    await expect(page.locator('.metric-card')).toContainText('Tenants Ativos');
    await expect(page.locator('.metric-card')).toContainText('MRR');
    await expect(page.locator('.metric-card')).toContainText('Usuários');
  });

  test('deve exibir gráfico de receita', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    
    // Verificar gráfico
    await expect(page.locator('.revenue-chart')).toBeVisible();
  });

  test('deve exibir lista de novos tenants', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    
    // Verificar lista
    await expect(page.locator('.recent-tenants')).toBeVisible();
    await expect(page.locator('.recent-tenants h3')).toContainText('Novos Tenants');
  });

  test('deve exibir alertas do sistema', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    
    // Verificar seção de alertas
    await expect(page.locator('.system-alerts')).toBeVisible();
  });

  test('deve navegar para analytics', async ({ page }) => {
    await page.goto('/superadmin/dashboard');
    
    // Clicar em ver analytics
    await page.click('a:has-text("Ver Analytics")');
    
    // Verificar URL
    await expect(page).toHaveURL('/superadmin/analytics');
  });

  test('deve filtrar analytics por período', async ({ page }) => {
    await page.goto('/superadmin/analytics');
    
    // Selecionar período
    await page.selectOption('select[name="period"]', '30days');
    
    // Aguardar atualização
    await page.waitForTimeout(1000);
    
    // Verificar gráficos atualizados
    await expect(page.locator('.chart-container')).toBeVisible();
  });

  test('deve exibir métricas de crescimento', async ({ page }) => {
    await page.goto('/superadmin/analytics');
    
    // Verificar métricas
    await expect(page.locator('.growth-metrics')).toContainText('MRR');
    await expect(page.locator('.growth-metrics')).toContainText('ARR');
    await expect(page.locator('.growth-metrics')).toContainText('Churn Rate');
  });

  test('deve exibir funil de conversão', async ({ page }) => {
    await page.goto('/superadmin/analytics');
    
    // Verificar funil
    await expect(page.locator('.conversion-funnel')).toBeVisible();
    await expect(page.locator('.conversion-funnel')).toContainText('Trials');
    await expect(page.locator('.conversion-funnel')).toContainText('Conversões');
  });

  test('deve exportar relatório de analytics', async ({ page }) => {
    await page.goto('/superadmin/analytics');
    
    // Exportar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Exportar Relatório")')
    ]);
    
    // Verificar download
    expect(download.suggestedFilename()).toContain('analytics');
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('deve exibir top tenants por receita', async ({ page }) => {
    await page.goto('/superadmin/analytics');
    
    // Verificar ranking
    await expect(page.locator('.top-tenants')).toBeVisible();
    await expect(page.locator('.top-tenants h3')).toContainText('Top Tenants');
  });

  test('deve exibir status dos serviços', async ({ page }) => {
    await page.goto('/superadmin/system-health');
    
    // Verificar serviços
    await expect(page.locator('.service-status')).toContainText('Database');
    await expect(page.locator('.service-status')).toContainText('Redis');
    await expect(page.locator('.service-status')).toContainText('API');
  });

  test('deve exibir jobs em execução', async ({ page }) => {
    await page.goto('/superadmin/system-health');
    
    // Verificar jobs
    await expect(page.locator('.jobs-table')).toBeVisible();
    await expect(page.locator('.jobs-table')).toContainText('Backup Job');
    await expect(page.locator('.jobs-table')).toContainText('Payment Sync');
  });

  test('deve exibir logs do sistema', async ({ page }) => {
    await page.goto('/superadmin/system-health/logs');
    
    // Verificar logs
    await expect(page.locator('.logs-container')).toBeVisible();
  });

  test('deve filtrar logs por nível', async ({ page }) => {
    await page.goto('/superadmin/system-health/logs');
    
    // Filtrar por erro
    await page.selectOption('select[name="logLevel"]', 'error');
    await page.click('button:has-text("Filtrar")');
    
    // Verificar resultados
    await page.waitForTimeout(1000);
    await expect(page.locator('.log-entry')).toContainText('ERROR');
  });

  test('deve reiniciar job manualmente', async ({ page }) => {
    await page.goto('/superadmin/system-health');
    
    // Reiniciar job
    await page.click('.jobs-table tr:first-child button:has-text("Reiniciar")');
    
    // Confirmar
    await page.click('button:has-text("Confirmar")');
    
    // Verificar
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
