import { test, expect } from '@playwright/test';

/**
 * Testes E2E - Gestão de Tenants (SuperAdmin)
 * Valida CRUD completo de tenants
 */

test.describe('SuperAdmin - Gestão de Tenants', () => {
  let authToken: string;
  let createdTenantId: string;

  test.beforeAll(async ({ browser }) => {
    // Fazer login uma vez para todos os testes
    const page = await browser.newPage();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@medmanager.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
    // Extrair token do localStorage
    authToken = await page.evaluate(() => localStorage.getItem('token') || '');
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Definir token antes de cada teste
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
  });

  test('Deve navegar para tela de tenants', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Verificar título da página
    await expect(page.locator('h1')).toContainText(/tenant|empresas/i);
    
    // Verificar se a tabela está visível
    const table = page.locator('table').or(page.locator('[role="grid"]'));
    await expect(table).toBeVisible();
  });

  test('Deve listar tenants existentes', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Aguardar carregamento
    await page.waitForSelector('table tbody tr, [data-testid="tenant-item"]', { timeout: 10000 });
    
    // Verificar se há pelo menos um tenant
    const tenantRows = page.locator('table tbody tr, [data-testid="tenant-item"]');
    const count = await tenantRows.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('Deve criar novo tenant', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Clicar em "Novo Tenant"
    const newButton = page.locator('button:has-text("Novo")').or(page.locator('[data-testid="new-tenant"]'));
    await newButton.click();
    
    // Aguardar modal abrir
    await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
    
    // Preencher formulário
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Farmácia Teste ${timestamp}`);
    await page.fill('input[name="cnpj"]', '12345678000195');
    
    // Selecionar plano
    const planSelect = page.locator('select[name="plan"]').or(page.locator('[data-testid="plan-select"]'));
    await planSelect.selectOption('starter');
    
    // Submeter
    const submitButton = page.locator('button[type="submit"]:has-text("Criar")').or(page.locator('button:has-text("Salvar")'));
    await submitButton.click();
    
    // Aguardar sucesso
    await expect(page.locator('text=/criado com sucesso|tenant criado/i')).toBeVisible({ timeout: 10000 });
    
    // Verificar se o novo tenant aparece na lista
    await expect(page.locator(`text=Farmácia Teste ${timestamp}`)).toBeVisible();
  });

  test('Deve buscar tenant por nome', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Localizar campo de busca
    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    await searchInput.fill('Farmácia');
    
    // Aguardar filtro ser aplicado
    await page.waitForTimeout(1000);
    
    // Verificar se os resultados contêm o termo
    const results = page.locator('table tbody tr, [data-testid="tenant-item"]');
    const count = await results.count();
    
    if (count > 0) {
      const firstResult = results.first();
      await expect(firstResult).toContainText(/farmácia/i);
    }
  });

  test('Deve filtrar por status', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Selecionar filtro "Ativo"
    const statusFilter = page.locator('select:near(:text("Status"))').or(page.locator('[data-testid="status-filter"]'));
    
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption('active');
      await page.waitForTimeout(1000);
      
      // Verificar se todos os resultados são ativos
      const badges = page.locator('[class*="badge"], [class*="status"]');
      const count = await badges.count();
      
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const badgeText = await badges.nth(i).textContent();
          expect(badgeText?.toLowerCase()).toContain('ativ');
        }
      }
    }
  });

  test('Deve visualizar detalhes do tenant', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr, [data-testid="tenant-item"]', { timeout: 10000 });
    
    // Clicar no primeiro tenant (ícone de olho ou link)
    const viewButton = page.locator('button[title*="Ver"], a[href*="/tenants/"], [data-testid="view-tenant"]').first();
    await viewButton.click();
    
    // Verificar se está na página de detalhes
    await expect(page).toHaveURL(/.*tenants\/[a-f0-9-]+/);
    
    // Verificar se informações estão visíveis
    await expect(page.locator('text=/cnpj|informações|detalhes/i')).toBeVisible();
  });

  test('Deve editar tenant existente', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Clicar em editar no primeiro tenant
    const editButton = page.locator('button[title*="Editar"], [data-testid="edit-tenant"]').first();
    await editButton.click();
    
    // Aguardar modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Alterar nome
    const nameInput = page.locator('input[name="name"]');
    const currentName = await nameInput.inputValue();
    await nameInput.fill(`${currentName} (Editado)`);
    
    // Salvar
    const saveButton = page.locator('button[type="submit"]:has-text("Salvar")');
    await saveButton.click();
    
    // Verificar sucesso
    await expect(page.locator('text=/atualizado|salvo com sucesso/i')).toBeVisible({ timeout: 10000 });
  });

  test('Deve ativar/desativar tenant', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Clicar no botão de toggle status
    const toggleButton = page.locator('button[title*="Ativar"], button[title*="Desativar"], [data-testid="toggle-status"]').first();
    
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      
      // Confirmar ação no modal (se houver)
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sim")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }
      
      // Verificar sucesso
      await expect(page.locator('text=/status alterado|atualizado com sucesso/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Deve extender assinatura', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Procurar botão de extender assinatura
    const extendButton = page.locator('button:has-text("Extender"), [data-testid="extend-subscription"]').first();
    
    if (await extendButton.count() > 0) {
      await extendButton.click();
      
      // Aguardar modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Adicionar 3 meses
      const monthsInput = page.locator('input[name="months"], input[type="number"]');
      await monthsInput.fill('3');
      
      // Confirmar
      const confirmButton = page.locator('button[type="submit"]:has-text("Confirmar"), button:has-text("Extender")');
      await confirmButton.click();
      
      // Verificar sucesso
      await expect(page.locator('text=/assinatura extendida|estendida com sucesso/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Deve validar CNPJ ao criar tenant', async ({ page }) => {
    await page.goto('/superadmin/tenants');
    
    // Clicar em "Novo Tenant"
    const newButton = page.locator('button:has-text("Novo")');
    await newButton.click();
    
    // Aguardar modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Preencher com CNPJ inválido
    await page.fill('input[name="cnpj"]', '11111111111111');
    
    // Tentar submeter
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Verificar mensagem de erro
    await expect(page.locator('text=/cnpj inválido|cnpj deve ser válido/i')).toBeVisible({ timeout: 5000 });
  });
});
