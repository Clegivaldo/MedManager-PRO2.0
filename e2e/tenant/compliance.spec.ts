import { test, expect } from '@playwright/test';

test.describe('Tenant - Compliance SNGPC/Guia33', () => {
  test.beforeEach(async ({ page }) => {
    // Login como usuário do tenant
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@tenant.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('deve navegar para dashboard de compliance', async ({ page }) => {
    await page.click('a[href="/compliance"]');
    await expect(page).toHaveURL('/compliance');
    await expect(page.locator('h1')).toContainText('Compliance Regulatório');
  });

  test('deve exibir métricas do SNGPC', async ({ page }) => {
    await page.goto('/compliance/sngpc');
    
    // Verificar cards de métricas
    await expect(page.locator('.metric-card')).toContainText('Movimentações do Mês');
    await expect(page.locator('.metric-card')).toContainText('Pendentes de Envio');
    await expect(page.locator('.metric-card')).toContainText('Taxa de Sucesso');
  });

  test('deve registrar movimentação de controlado', async ({ page }) => {
    await page.goto('/compliance/sngpc');
    
    // Clicar em Nova Movimentação
    await page.click('button:has-text("Registrar Movimentação")');
    
    // Preencher formulário
    await page.selectOption('select[name="type"]', 'saida');
    await page.selectOption('select[name="productId"]', { index: 1 }); // Produto controlado
    await page.fill('input[name="quantity"]', '2');
    await page.fill('input[name="prescriptionNumber"]', 'RX123456');
    await page.fill('input[name="prescriptionDate"]', '2025-01-15');
    await page.fill('input[name="doctorCRM"]', '12345');
    await page.selectOption('select[name="doctorState"]', 'SP');
    await page.fill('input[name="patientCPF"]', '123.456.789-00');
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar sucesso
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve validar dados da receita', async ({ page }) => {
    await page.goto('/compliance/sngpc');
    
    // Nova movimentação
    await page.click('button:has-text("Registrar Movimentação")');
    
    // Preencher com CRM inválido
    await page.selectOption('select[name="type"]', 'saida');
    await page.selectOption('select[name="productId"]', { index: 1 });
    await page.fill('input[name="prescriptionNumber"]', 'RX123');
    await page.fill('input[name="doctorCRM"]', '123'); // CRM muito curto
    
    // Tentar salvar
    await page.click('button[type="submit"]');
    
    // Verificar erro
    await expect(page.locator('.field-error')).toContainText('CRM inválido');
  });

  test('deve enviar movimentações para SNGPC', async ({ page }) => {
    await page.goto('/compliance/sngpc');
    
    // Clicar em Enviar Pendentes
    await page.click('button:has-text("Enviar Pendentes")');
    
    // Confirmar envio
    await page.click('button:has-text("Confirmar Envio")');
    
    // Aguardar processamento
    await expect(page.locator('.toast-info')).toContainText('processando', { timeout: 10000 });
  });

  test('deve gerar relatório Guia 33', async ({ page }) => {
    await page.goto('/compliance/guia33');
    
    // Selecionar período
    await page.selectOption('select[name="year"]', '2025');
    await page.selectOption('select[name="semester"]', '1');
    
    // Gerar relatório
    await page.click('button:has-text("Gerar Relatório")');
    
    // Aguardar geração
    await expect(page.locator('.report-preview')).toBeVisible({ timeout: 10000 });
  });

  test('deve validar relatório Guia 33', async ({ page }) => {
    await page.goto('/compliance/guia33');
    
    // Gerar relatório
    await page.selectOption('select[name="year"]', '2025');
    await page.selectOption('select[name="semester"]', '1');
    await page.click('button:has-text("Gerar Relatório")');
    await page.waitForTimeout(2000);
    
    // Validar
    await page.click('button:has-text("Validar Relatório")');
    
    // Verificar resultado
    await expect(page.locator('.validation-result')).toBeVisible();
  });

  test('deve exportar relatório Guia 33', async ({ page }) => {
    await page.goto('/compliance/guia33');
    
    // Gerar e exportar
    await page.selectOption('select[name="year"]', '2025');
    await page.selectOption('select[name="semester"]', '1');
    await page.click('button:has-text("Gerar Relatório")');
    await page.waitForTimeout(2000);
    
    // Exportar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Exportar")')
    ]);
    
    // Verificar download
    expect(download.suggestedFilename()).toContain('guia33');
  });

  test('deve listar produtos controlados', async ({ page }) => {
    await page.goto('/compliance/products');
    
    // Aguardar carregamento
    await page.waitForSelector('table tbody tr');
    
    // Verificar tabela
    await expect(page.locator('table thead')).toContainText('Produto');
    await expect(page.locator('table thead')).toContainText('Princípio Ativo');
    await expect(page.locator('table thead')).toContainText('Lista');
    await expect(page.locator('table thead')).toContainText('Estoque');
  });

  test('deve filtrar movimentações por período', async ({ page }) => {
    await page.goto('/compliance/sngpc/movements');
    
    // Definir filtro
    await page.fill('input[name="startDate"]', '2025-01-01');
    await page.fill('input[name="endDate"]', '2025-01-31');
    await page.click('button:has-text("Filtrar")');
    
    // Verificar resultados
    await page.waitForTimeout(1000);
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('deve consultar receita no sistema', async ({ page }) => {
    await page.goto('/compliance/sngpc');
    
    // Buscar receita
    await page.click('button:has-text("Consultar Receita")');
    await page.fill('input[name="prescriptionNumber"]', 'RX123456');
    await page.click('button:has-text("Buscar")');
    
    // Verificar resultado
    await expect(page.locator('.prescription-details')).toBeVisible();
  });

  test('deve registrar perda/quebra de controlado', async ({ page }) => {
    await page.goto('/compliance/sngpc');
    
    // Registrar perda
    await page.click('button:has-text("Registrar Perda/Quebra")');
    
    // Preencher
    await page.selectOption('select[name="productId"]', { index: 1 });
    await page.fill('input[name="quantity"]', '1');
    await page.fill('textarea[name="reason"]', 'Produto vencido');
    await page.fill('input[name="batchNumber"]', 'LOTE123');
    
    // Salvar
    await page.click('button[type="submit"]');
    
    // Verificar
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('deve exibir dashboard de temperatura', async ({ page }) => {
    await page.goto('/compliance/temperature');
    
    // Verificar gráfico
    await expect(page.locator('.temperature-chart')).toBeVisible();
    await expect(page.locator('.current-temperature')).toBeVisible();
  });

  test('deve registrar alerta de temperatura', async ({ page }) => {
    await page.goto('/compliance/temperature');
    
    // Simular alerta
    await page.click('button:has-text("Simular Alerta")');
    
    // Verificar notificação
    await expect(page.locator('.alert-danger')).toContainText('temperatura fora do limite');
  });

  test('deve exportar histórico de movimentações', async ({ page }) => {
    await page.goto('/compliance/sngpc/movements');
    
    // Exportar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Exportar")')
    ]);
    
    // Verificar download
    expect(download.suggestedFilename()).toContain('movimentacoes');
  });

  test('deve validar CPF do paciente', async ({ page }) => {
    await page.goto('/compliance/sngpc');
    
    // Nova movimentação
    await page.click('button:has-text("Registrar Movimentação")');
    
    // Preencher com CPF inválido
    await page.fill('input[name="patientCPF"]', '111.111.111-11');
    
    // Verificar validação
    await page.click('button[type="submit"]');
    await expect(page.locator('.field-error')).toContainText('CPF inválido');
  });
});
