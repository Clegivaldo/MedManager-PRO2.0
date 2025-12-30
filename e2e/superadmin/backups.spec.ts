import { test, expect } from '@playwright/test';

test.describe('SuperAdmin - Gestão de Backups', () => {
  test.beforeEach(async ({ page }) => {
    // Login como superadmin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@medmanager.com.br');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/superadmin/dashboard');
  });

  test('deve navegar para tela de backups', async ({ page }) => {
    await page.click('a[href="/superadmin/backups"]');
    await expect(page).toHaveURL('/superadmin/backups');
    await expect(page.locator('h1')).toContainText('Backups');
  });

  test('deve listar backups de todos os tenants', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Aguardar carregamento
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    // Verificar colunas
    await expect(page.locator('table thead')).toContainText('Tenant');
    await expect(page.locator('table thead')).toContainText('Data');
    await expect(page.locator('table thead')).toContainText('Tamanho');
    await expect(page.locator('table thead')).toContainText('Status');
  });

  test('deve criar backup manual de tenant', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Novo backup
    await page.click('button:has-text("Criar Backup")');
    
    // Selecionar tenant
    await page.selectOption('select[name="tenantId"]', { index: 1 });
    
    // Criar
    await page.click('button[type="submit"]');
    
    // Verificar processamento
    await expect(page.locator('.toast-info')).toContainText('criando backup', { timeout: 10000 });
  });

  test('deve baixar backup', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Baixar primeiro backup completo
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('table tbody tr:has(.badge-success):first-child button:has-text("Download")')
    ]);
    
    // Verificar download
    expect(download.suggestedFilename()).toContain('backup');
    expect(download.suggestedFilename()).toMatch(/\.(sql|gz|zip)$/);
  });

  test('deve restaurar backup', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Restaurar
    await page.click('table tbody tr:first-child button:has-text("Restaurar")');
    
    // Confirmar (ação perigosa)
    await page.fill('input[name="confirmation"]', 'RESTAURAR');
    await page.click('button:has-text("Confirmar Restauração")');
    
    // Verificar processamento
    await expect(page.locator('.toast-warning')).toContainText('restaurando', { timeout: 10000 });
  });

  test('deve deletar backup antigo', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Deletar
    await page.click('table tbody tr:last-child button:has-text("Deletar")');
    
    // Confirmar
    await page.click('button:has-text("Confirmar")');
    
    // Verificar
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve filtrar backups por tenant', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Filtrar
    await page.selectOption('select[name="tenantFilter"]', { index: 1 });
    await page.click('button:has-text("Filtrar")');
    
    // Verificar resultados
    await page.waitForTimeout(1000);
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('deve filtrar backups por período', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Definir período
    await page.fill('input[name="startDate"]', '2025-01-01');
    await page.fill('input[name="endDate"]', '2025-01-31');
    await page.click('button:has-text("Filtrar")');
    
    // Verificar
    await page.waitForTimeout(1000);
  });

  test('deve exibir estatísticas de backups', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Verificar métricas
    await expect(page.locator('.stats-card')).toContainText('Total de Backups');
    await expect(page.locator('.stats-card')).toContainText('Backups Hoje');
    await expect(page.locator('.stats-card')).toContainText('Espaço Utilizado');
  });

  test('deve configurar backup automático', async ({ page }) => {
    await page.goto('/superadmin/backups/settings');
    
    // Habilitar backup automático
    await page.check('input[name="autoBackup"]');
    
    // Configurar horário
    await page.fill('input[name="backupTime"]', '02:00');
    
    // Configurar retenção
    await page.fill('input[name="retentionDays"]', '30');
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve visualizar log de backup', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Ver log
    await page.click('table tbody tr:first-child button:has-text("Ver Log")');
    
    // Verificar modal
    await expect(page.locator('.modal-title')).toContainText('Log do Backup');
    await expect(page.locator('.log-content')).toBeVisible();
  });

  test('deve validar restauração em produção', async ({ page }) => {
    await page.goto('/superadmin/backups');
    
    // Tentar restaurar
    await page.click('table tbody tr:first-child button:has-text("Restaurar")');
    
    // Verificar aviso
    await expect(page.locator('.alert-danger')).toContainText('Esta ação não pode ser desfeita');
  });
});
