import { test, expect } from '@playwright/test';

test.describe('Tenant - Gestão de Estoque', () => {
  test.beforeEach(async ({ page }) => {
    // Login como usuário do tenant
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@tenant.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('deve navegar para tela de estoque', async ({ page }) => {
    await page.click('a[href="/inventory"]');
    await expect(page).toHaveURL('/inventory');
    await expect(page.locator('h1')).toContainText('Estoque');
  });

  test('deve listar itens em estoque', async ({ page }) => {
    await page.goto('/inventory');
    
    // Aguardar carregamento
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    // Verificar colunas da tabela
    await expect(page.locator('table thead')).toContainText('Produto');
    await expect(page.locator('table thead')).toContainText('Lote');
    await expect(page.locator('table thead')).toContainText('Quantidade');
    await expect(page.locator('table thead')).toContainText('Validade');
    await expect(page.locator('table thead')).toContainText('Localização');
  });

  test('deve registrar entrada de estoque', async ({ page }) => {
    await page.goto('/inventory');
    
    // Clicar em Nova Entrada
    await page.click('button:has-text("Nova Entrada")');
    
    // Preencher formulário
    await page.selectOption('select[name="productId"]', { index: 1 });
    await page.fill('input[name="batchNumber"]', `LOTE${Date.now()}`);
    await page.fill('input[name="quantity"]', '100');
    await page.fill('input[name="expiryDate"]', '2025-12-31');
    await page.fill('input[name="location"]', 'A1-P2-N3');
    await page.fill('input[name="costPrice"]', '25.90');
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar sucesso
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('table tbody')).toContainText('LOTE');
  });

  test('deve registrar saída de estoque', async ({ page }) => {
    await page.goto('/inventory');
    
    // Selecionar item
    await page.click('table tbody tr:first-child button:has-text("Movimentar")');
    
    // Escolher saída
    await page.click('button:has-text("Registrar Saída")');
    
    // Preencher quantidade
    await page.fill('input[name="quantity"]', '10');
    await page.fill('textarea[name="reason"]', 'Venda para cliente');
    
    // Confirmar
    await page.click('button:has-text("Confirmar Saída")');
    
    // Verificar sucesso
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve filtrar por produto', async ({ page }) => {
    await page.goto('/inventory');
    
    // Aguardar carregamento
    await page.waitForSelector('table tbody tr');
    
    // Usar filtro
    await page.fill('input[name="productSearch"]', 'Dipirona');
    await page.click('button:has-text("Filtrar")');
    
    // Verificar resultados
    await page.waitForTimeout(1000);
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('deve filtrar itens próximos ao vencimento', async ({ page }) => {
    await page.goto('/inventory');
    
    // Clicar em filtro de vencimento
    await page.click('button:has-text("Próximos ao Vencimento")');
    
    // Verificar alerta
    await expect(page.locator('.alert-warning')).toBeVisible();
  });

  test('deve filtrar itens com estoque baixo', async ({ page }) => {
    await page.goto('/inventory');
    
    // Clicar em filtro de estoque baixo
    await page.click('button:has-text("Estoque Baixo")');
    
    // Verificar alerta
    await expect(page.locator('.alert-danger')).toBeVisible();
  });

  test('deve visualizar detalhes do lote', async ({ page }) => {
    await page.goto('/inventory');
    
    // Clicar em um lote
    await page.click('table tbody tr:first-child td:first-child');
    
    // Verificar modal
    await expect(page.locator('.modal-title')).toContainText('Detalhes do Lote');
    await expect(page.locator('.modal-body')).toContainText('Número do Lote');
    await expect(page.locator('.modal-body')).toContainText('Quantidade Disponível');
    await expect(page.locator('.modal-body')).toContainText('Data de Validade');
  });

  test('deve visualizar histórico de movimentações', async ({ page }) => {
    await page.goto('/inventory');
    
    // Clicar em histórico
    await page.click('table tbody tr:first-child button:has-text("Histórico")');
    
    // Verificar modal de histórico
    await expect(page.locator('.modal-title')).toContainText('Histórico de Movimentações');
    await expect(page.locator('table')).toContainText('Data');
    await expect(page.locator('table')).toContainText('Tipo');
    await expect(page.locator('table')).toContainText('Quantidade');
  });

  test('deve exportar relatório de estoque', async ({ page }) => {
    await page.goto('/inventory');
    
    // Clicar em exportar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Exportar")')
    ]);
    
    // Verificar download
    expect(download.suggestedFilename()).toContain('estoque');
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('deve validar quantidade negativa', async ({ page }) => {
    await page.goto('/inventory');
    
    // Clicar em Nova Entrada
    await page.click('button:has-text("Nova Entrada")');
    
    // Preencher com quantidade negativa
    await page.selectOption('select[name="productId"]', { index: 1 });
    await page.fill('input[name="batchNumber"]', 'LOTE123');
    await page.fill('input[name="quantity"]', '-10');
    
    // Tentar salvar
    await page.click('button[type="submit"]');
    
    // Verificar erro
    await expect(page.locator('.field-error')).toContainText('deve ser maior que zero');
  });

  test('deve validar data de validade passada', async ({ page }) => {
    await page.goto('/inventory');
    
    // Clicar em Nova Entrada
    await page.click('button:has-text("Nova Entrada")');
    
    // Preencher com data passada
    await page.selectOption('select[name="productId"]', { index: 1 });
    await page.fill('input[name="batchNumber"]', 'LOTE123');
    await page.fill('input[name="quantity"]', '100');
    await page.fill('input[name="expiryDate"]', '2020-01-01');
    
    // Tentar salvar
    await page.click('button[type="submit"]');
    
    // Verificar alerta
    await expect(page.locator('.alert-warning')).toContainText('validade já passou');
  });
});
