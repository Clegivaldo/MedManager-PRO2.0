import { test, expect } from '@playwright/test';

test.describe('Tenant - Gestão de Pedidos', () => {
  test.beforeEach(async ({ page }) => {
    // Login como usuário do tenant
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@tenant.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('deve navegar para tela de pedidos', async ({ page }) => {
    await page.click('a[href="/orders"]');
    await expect(page).toHaveURL('/orders');
    await expect(page.locator('h1')).toContainText('Pedidos');
  });

  test('deve listar pedidos existentes', async ({ page }) => {
    await page.goto('/orders');
    
    // Aguardar carregamento
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    // Verificar colunas
    await expect(page.locator('table thead')).toContainText('Número');
    await expect(page.locator('table thead')).toContainText('Cliente');
    await expect(page.locator('table thead')).toContainText('Data');
    await expect(page.locator('table thead')).toContainText('Status');
    await expect(page.locator('table thead')).toContainText('Total');
  });

  test('deve criar novo pedido', async ({ page }) => {
    await page.goto('/orders');
    
    // Clicar em Novo Pedido
    await page.click('button:has-text("Novo Pedido")');
    
    // Preencher cabeçalho
    await page.selectOption('select[name="customerId"]', { index: 1 });
    await page.selectOption('select[name="paymentMethod"]', 'credit_card');
    
    // Adicionar item
    await page.click('button:has-text("Adicionar Item")');
    await page.selectOption('select[name="items[0].productId"]', { index: 1 });
    await page.fill('input[name="items[0].quantity"]', '10');
    
    // Verificar cálculo automático
    await page.waitForTimeout(500);
    const totalEl = await page.locator('input[name="total"]');
    const total = await totalEl.inputValue();
    expect(parseFloat(total)).toBeGreaterThan(0);
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar sucesso
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page).toHaveURL(/\/orders\/\d+/);
  });

  test('deve adicionar múltiplos itens ao pedido', async ({ page }) => {
    await page.goto('/orders/new');
    
    // Selecionar cliente
    await page.selectOption('select[name="customerId"]', { index: 1 });
    
    // Adicionar primeiro item
    await page.click('button:has-text("Adicionar Item")');
    await page.selectOption('select[name="items[0].productId"]', { index: 1 });
    await page.fill('input[name="items[0].quantity"]', '5');
    
    // Adicionar segundo item
    await page.click('button:has-text("Adicionar Item")');
    await page.selectOption('select[name="items[1].productId"]', { index: 2 });
    await page.fill('input[name="items[1].quantity"]', '3');
    
    // Verificar total
    await page.waitForTimeout(500);
    const items = await page.locator('.order-item').count();
    expect(items).toBe(2);
  });

  test('deve remover item do pedido', async ({ page }) => {
    await page.goto('/orders/new');
    
    // Adicionar item
    await page.click('button:has-text("Adicionar Item")');
    await page.selectOption('select[name="items[0].productId"]', { index: 1 });
    
    // Adicionar outro item
    await page.click('button:has-text("Adicionar Item")');
    
    // Remover primeiro item
    await page.click('.order-item:first-child button.remove-item');
    
    // Verificar
    const items = await page.locator('.order-item').count();
    expect(items).toBe(1);
  });

  test('deve filtrar pedidos por status', async ({ page }) => {
    await page.goto('/orders');
    
    // Selecionar filtro
    await page.selectOption('select[name="statusFilter"]', 'pending');
    await page.click('button:has-text("Filtrar")');
    
    // Verificar resultados
    await page.waitForTimeout(1000);
    const badges = page.locator('.badge-warning');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve buscar pedido por número', async ({ page }) => {
    await page.goto('/orders');
    
    // Buscar
    await page.fill('input[name="search"]', '001');
    await page.click('button:has-text("Buscar")');
    
    // Verificar resultados
    await page.waitForTimeout(1000);
    await expect(page.locator('table tbody')).toContainText('001');
  });

  test('deve visualizar detalhes do pedido', async ({ page }) => {
    await page.goto('/orders');
    
    // Clicar no primeiro pedido
    await page.click('table tbody tr:first-child td:first-child');
    
    // Verificar detalhes
    await expect(page).toHaveURL(/\/orders\/\d+/);
    await expect(page.locator('h1')).toContainText('Pedido');
    await expect(page.locator('.order-details')).toContainText('Cliente');
    await expect(page.locator('.order-details')).toContainText('Itens');
    await expect(page.locator('.order-details')).toContainText('Total');
  });

  test('deve cancelar pedido', async ({ page }) => {
    await page.goto('/orders');
    
    // Clicar no primeiro pedido
    await page.click('table tbody tr:first-child');
    
    // Clicar em cancelar
    await page.click('button:has-text("Cancelar Pedido")');
    
    // Confirmar
    await page.fill('textarea[name="cancelReason"]', 'Cliente solicitou cancelamento');
    await page.click('button:has-text("Confirmar Cancelamento")');
    
    // Verificar
    await expect(page.locator('.badge-danger')).toContainText('Cancelado');
  });

  test('deve gerar NFe do pedido', async ({ page }) => {
    await page.goto('/orders');
    
    // Clicar no primeiro pedido aprovado
    await page.click('table tbody tr:has(.badge-success):first-child');
    
    // Clicar em Emitir NFe
    await page.click('button:has-text("Emitir NFe")');
    
    // Confirmar
    await page.click('button:has-text("Confirmar Emissão")');
    
    // Aguardar processamento
    await expect(page.locator('.toast-info')).toContainText('processando', { timeout: 10000 });
  });

  test('deve aplicar desconto ao pedido', async ({ page }) => {
    await page.goto('/orders/new');
    
    // Adicionar cliente e item
    await page.selectOption('select[name="customerId"]', { index: 1 });
    await page.click('button:has-text("Adicionar Item")');
    await page.selectOption('select[name="items[0].productId"]', { index: 1 });
    await page.fill('input[name="items[0].quantity"]', '10');
    
    // Aplicar desconto
    await page.fill('input[name="discountPercent"]', '10');
    
    // Verificar recalculo
    await page.waitForTimeout(500);
    const discount = await page.locator('.discount-value').textContent();
    expect(discount).toContain('R$');
  });

  test('deve validar quantidade em estoque', async ({ page }) => {
    await page.goto('/orders/new');
    
    // Adicionar cliente
    await page.selectOption('select[name="customerId"]', { index: 1 });
    
    // Tentar adicionar quantidade maior que estoque
    await page.click('button:has-text("Adicionar Item")');
    await page.selectOption('select[name="items[0].productId"]', { index: 1 });
    await page.fill('input[name="items[0].quantity"]', '999999');
    
    // Tentar salvar
    await page.click('button[type="submit"]');
    
    // Verificar erro
    await expect(page.locator('.alert-danger')).toContainText('estoque insuficiente');
  });

  test('deve exportar pedidos para Excel', async ({ page }) => {
    await page.goto('/orders');
    
    // Clicar em exportar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Exportar")')
    ]);
    
    // Verificar download
    expect(download.suggestedFilename()).toContain('pedidos');
    expect(download.suggestedFilename()).toContain('.xlsx');
  });
});
