import { test, expect } from '@playwright/test';

test.describe('Tenant - Gestão de NFe', () => {
  test.beforeEach(async ({ page }) => {
    // Login como usuário do tenant
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@tenant.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('deve navegar para tela de NFe', async ({ page }) => {
    await page.click('a[href="/nfe"]');
    await expect(page).toHaveURL('/nfe');
    await expect(page.locator('h1')).toContainText('Notas Fiscais');
  });

  test('deve listar notas fiscais', async ({ page }) => {
    await page.goto('/nfe');
    
    // Aguardar carregamento
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    // Verificar colunas
    await expect(page.locator('table thead')).toContainText('Número');
    await expect(page.locator('table thead')).toContainText('Série');
    await expect(page.locator('table thead')).toContainText('Cliente');
    await expect(page.locator('table thead')).toContainText('Emissão');
    await expect(page.locator('table thead')).toContainText('Valor');
    await expect(page.locator('table thead')).toContainText('Status');
  });

  test('deve emitir nova NFe', async ({ page }) => {
    await page.goto('/nfe');
    
    // Clicar em Nova NFe
    await page.click('button:has-text("Emitir NFe")');
    
    // Selecionar pedido
    await page.selectOption('select[name="orderId"]', { index: 1 });
    
    // Verificar dados preenchidos automaticamente
    await page.waitForTimeout(1000);
    await expect(page.locator('input[name="clientName"]')).not.toBeEmpty();
    await expect(page.locator('input[name="clientCNPJ"]')).not.toBeEmpty();
    
    // Selecionar natureza da operação
    await page.selectOption('select[name="naturezaOperacao"]', 'venda');
    
    // Emitir
    await page.click('button[type="submit"]');
    
    // Verificar processamento
    await expect(page.locator('.toast-info')).toContainText('enviando para SEFAZ', { timeout: 10000 });
  });

  test('deve consultar status da NFe', async ({ page }) => {
    await page.goto('/nfe');
    
    // Selecionar NFe em processamento
    await page.click('table tbody tr:has(.badge-warning):first-child');
    
    // Consultar status
    await page.click('button:has-text("Consultar Status")');
    
    // Aguardar resposta
    await expect(page.locator('.status-result')).toBeVisible({ timeout: 10000 });
  });

  test('deve baixar XML da NFe', async ({ page }) => {
    await page.goto('/nfe');
    
    // Selecionar NFe autorizada
    await page.click('table tbody tr:has(.badge-success):first-child button:has-text("Ações")');
    
    // Baixar XML
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download XML")')
    ]);
    
    // Verificar download
    expect(download.suggestedFilename()).toContain('.xml');
  });

  test('deve baixar DANFE da NFe', async ({ page }) => {
    await page.goto('/nfe');
    
    // Selecionar NFe autorizada
    await page.click('table tbody tr:has(.badge-success):first-child button:has-text("Ações")');
    
    // Baixar DANFE
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Imprimir DANFE")')
    ]);
    
    // Verificar download
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('deve cancelar NFe', async ({ page }) => {
    await page.goto('/nfe');
    
    // Selecionar NFe autorizada recente (até 24h)
    await page.click('table tbody tr:has(.badge-success):first-child button:has-text("Ações")');
    
    // Cancelar
    await page.click('button:has-text("Cancelar NFe")');
    
    // Preencher justificativa
    await page.fill('textarea[name="justificativa"]', 'Cliente solicitou cancelamento da compra. Produto será devolvido ao estoque.');
    
    // Confirmar
    await page.click('button:has-text("Confirmar Cancelamento")');
    
    // Aguardar processamento
    await expect(page.locator('.toast-info')).toContainText('processando', { timeout: 10000 });
  });

  test('deve criar carta de correção', async ({ page }) => {
    await page.goto('/nfe');
    
    // Selecionar NFe autorizada
    await page.click('table tbody tr:has(.badge-success):first-child button:has-text("Ações")');
    
    // Carta de Correção
    await page.click('button:has-text("Carta de Correção")');
    
    // Preencher correção
    await page.fill('textarea[name="correcao"]', 'Correção no endereço de entrega: Rua das Flores, 123 - Apto 45');
    
    // Enviar
    await page.click('button:has-text("Enviar CCe")');
    
    // Verificar sucesso
    await expect(page.locator('.toast-success')).toContainText('enviada', { timeout: 10000 });
  });

  test('deve inutilizar numeração', async ({ page }) => {
    await page.goto('/nfe');
    
    // Clicar em Inutilizar
    await page.click('button:has-text("Inutilizar Numeração")');
    
    // Preencher dados
    await page.selectOption('select[name="serie"]', '1');
    await page.fill('input[name="numeroInicial"]', '100');
    await page.fill('input[name="numeroFinal"]', '105');
    await page.fill('textarea[name="justificativa"]', 'Numeração pulada por erro no sistema');
    
    // Confirmar
    await page.click('button[type="submit"]');
    
    // Verificar processamento
    await expect(page.locator('.toast-info')).toContainText('processando', { timeout: 10000 });
  });

  test('deve filtrar NFe por período', async ({ page }) => {
    await page.goto('/nfe');
    
    // Definir período
    await page.fill('input[name="dataInicio"]', '2025-01-01');
    await page.fill('input[name="dataFim"]', '2025-01-31');
    await page.click('button:has-text("Filtrar")');
    
    // Verificar resultados
    await page.waitForTimeout(1000);
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('deve filtrar NFe por status', async ({ page }) => {
    await page.goto('/nfe');
    
    // Selecionar status
    await page.selectOption('select[name="statusFilter"]', 'authorized');
    await page.click('button:has-text("Filtrar")');
    
    // Verificar badges
    const badges = page.locator('.badge-success');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deve buscar NFe por número', async ({ page }) => {
    await page.goto('/nfe');
    
    // Buscar
    await page.fill('input[name="search"]', '000001');
    await page.click('button:has-text("Buscar")');
    
    // Verificar resultado
    await page.waitForTimeout(1000);
    await expect(page.locator('table tbody')).toContainText('000001');
  });

  test('deve validar certificado digital', async ({ page }) => {
    await page.goto('/nfe');
    
    // Clicar em configurações
    await page.click('button:has-text("Configurações NFe")');
    
    // Verificar status do certificado
    await expect(page.locator('.certificate-status')).toBeVisible();
    
    // Verificar validade
    const validity = await page.locator('.certificate-validity').textContent();
    expect(validity).toContain('Válido até');
  });

  test('deve enviar NFe por email', async ({ page }) => {
    await page.goto('/nfe');
    
    // Selecionar NFe autorizada
    await page.click('table tbody tr:has(.badge-success):first-child button:has-text("Ações")');
    
    // Enviar por email
    await page.click('button:has-text("Enviar por Email")');
    
    // Confirmar email
    await page.fill('input[name="email"]', 'cliente@exemplo.com');
    await page.click('button:has-text("Enviar")');
    
    // Verificar sucesso
    await expect(page.locator('.toast-success')).toContainText('enviado');
  });

  test('deve visualizar detalhes da NFe', async ({ page }) => {
    await page.goto('/nfe');
    
    // Clicar em uma NFe
    await page.click('table tbody tr:first-child td:first-child');
    
    // Verificar detalhes
    await expect(page).toHaveURL(/\/nfe\/\d+/);
    await expect(page.locator('.nfe-details')).toContainText('Número');
    await expect(page.locator('.nfe-details')).toContainText('Chave de Acesso');
    await expect(page.locator('.nfe-details')).toContainText('Protocolo');
    await expect(page.locator('.nfe-details')).toContainText('Itens');
  });

  test('deve exibir histórico de eventos da NFe', async ({ page }) => {
    await page.goto('/nfe');
    
    // Selecionar NFe
    await page.click('table tbody tr:first-child');
    
    // Ver histórico
    await page.click('button:has-text("Histórico")');
    
    // Verificar eventos
    await expect(page.locator('.event-timeline')).toBeVisible();
    await expect(page.locator('.event-timeline')).toContainText('Emitida');
  });
});
