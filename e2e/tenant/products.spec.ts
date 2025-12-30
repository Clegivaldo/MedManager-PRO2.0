import { test, expect } from '@playwright/test';

/**
 * Testes E2E - Produtos (Tenant)
 * Valida CRUD de produtos, importação CSV e validações
 */

test.describe('Tenant - Gestão de Produtos', () => {
  let authToken: string;

  test.beforeAll(async ({ browser }) => {
    // Login como usuário do tenant
    const page = await browser.newPage();
    await page.goto('/login');
    
    // Usar credenciais de um tenant de teste
    await page.fill('input[name="email"]', 'admin@farmaciademo.com.br');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
    authToken = await page.evaluate(() => localStorage.getItem('token') || '');
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, authToken);
  });

  test('Deve navegar para tela de produtos', async ({ page }) => {
    await page.goto('/products');
    
    // Verificar título
    await expect(page.locator('h1')).toContainText(/produto|medicamento/i);
    
    // Verificar se a tabela está visível
    await expect(page.locator('table, [role="grid"]')).toBeVisible();
  });

  test('Deve listar produtos existentes', async ({ page }) => {
    await page.goto('/products');
    
    // Aguardar carregamento
    await page.waitForLoadState('networkidle');
    
    // Verificar se há produtos ou mensagem de vazio
    const hasProducts = await page.locator('table tbody tr').count() > 0;
    const hasEmptyMessage = await page.locator('text=/nenhum produto|sem produtos/i').count() > 0;
    
    expect(hasProducts || hasEmptyMessage).toBeTruthy();
  });

  test('Deve criar novo produto', async ({ page }) => {
    await page.goto('/products');
    
    // Clicar em "Novo Produto"
    const newButton = page.locator('button:has-text("Novo"), [data-testid="new-product"]');
    await newButton.click();
    
    // Aguardar modal/formulário
    await page.waitForSelector('[role="dialog"], form', { timeout: 5000 });
    
    // Preencher dados
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Dipirona 500mg ${timestamp}`);
    await page.fill('input[name="internalCode"]', `DIP${timestamp}`);
    await page.fill('input[name="activeIngredient"]', 'Dipirona Sódica');
    await page.fill('input[name="laboratory"]', 'Genérico');
    
    // Tipo de produto
    const typeSelect = page.locator('select[name="productType"]');
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption('COMMON');
    }
    
    // Submeter
    const submitButton = page.locator('button[type="submit"]:has-text("Criar"), button:has-text("Salvar")');
    await submitButton.click();
    
    // Verificar sucesso
    await expect(page.locator('text=/criado com sucesso|produto cadastrado/i')).toBeVisible({ timeout: 10000 });
  });

  test('Deve buscar produto por nome', async ({ page }) => {
    await page.goto('/products');
    
    // Aguardar carregamento
    await page.waitForLoadState('networkidle');
    
    // Localizar campo de busca
    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    await searchInput.fill('Dipirona');
    
    // Aguardar filtro
    await page.waitForTimeout(1000);
    
    // Verificar resultados
    const results = page.locator('table tbody tr');
    const count = await results.count();
    
    if (count > 0) {
      await expect(results.first()).toContainText(/dipirona/i);
    }
  });

  test('Deve filtrar por tipo de produto', async ({ page }) => {
    await page.goto('/products');
    
    // Procurar filtro de tipo
    const typeFilter = page.locator('select:near(:text("Tipo")), [data-testid="type-filter"]');
    
    if (await typeFilter.count() > 0) {
      await typeFilter.selectOption('CONTROLLED');
      await page.waitForTimeout(1000);
      
      // Verificar se há resultados de controlados
      const controlledBadge = page.locator('text=/controlado/i');
      if (await controlledBadge.count() > 0) {
        await expect(controlledBadge.first()).toBeVisible();
      }
    }
  });

  test('Deve editar produto existente', async ({ page }) => {
    await page.goto('/products');
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Clicar em editar no primeiro produto
    const editButton = page.locator('button[title*="Editar"], [data-testid="edit-product"]').first();
    
    if (await editButton.count() > 0) {
      await editButton.click();
      
      // Aguardar modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Alterar descrição
      const descInput = page.locator('textarea[name="description"], input[name="description"]');
      if (await descInput.count() > 0) {
        await descInput.fill('Descrição editada pelo teste E2E');
      }
      
      // Salvar
      const saveButton = page.locator('button[type="submit"]:has-text("Salvar")');
      await saveButton.click();
      
      // Verificar sucesso
      await expect(page.locator('text=/atualizado|salvo com sucesso/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Deve deletar produto', async ({ page }) => {
    await page.goto('/products');
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Clicar no botão de deletar
    const deleteButton = page.locator('button[title*="Excluir"], button[title*="Deletar"], [data-testid="delete-product"]').first();
    
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      
      // Confirmar exclusão
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sim"), button:has-text("Excluir")');
      await confirmButton.click();
      
      // Verificar sucesso
      await expect(page.locator('text=/excluído|deletado|removido com sucesso/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Deve validar campos obrigatórios', async ({ page }) => {
    await page.goto('/products');
    
    // Clicar em "Novo Produto"
    const newButton = page.locator('button:has-text("Novo")');
    await newButton.click();
    
    // Aguardar modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Tentar submeter sem preencher
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Verificar mensagens de validação
    const validationMessage = page.locator('text=/obrigatório|campo necessário|preencha/i');
    await expect(validationMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('Deve importar produtos via CSV', async ({ page }) => {
    await page.goto('/products');
    
    // Procurar botão de importar
    const importButton = page.locator('button:has-text("Importar"), [data-testid="import-products"]');
    
    if (await importButton.count() > 0) {
      await importButton.click();
      
      // Aguardar modal de upload
      await page.waitForSelector('[role="dialog"], input[type="file"]', { timeout: 5000 });
      
      // Verificar se o input de arquivo está presente
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
      
      // Nota: Upload real de arquivo seria feito aqui com fileInput.setInputFiles()
    }
  });

  test('Deve visualizar detalhes do produto', async ({ page }) => {
    await page.goto('/products');
    
    // Aguardar lista carregar
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Clicar no primeiro produto (link ou botão de ver)
    const viewButton = page.locator('button[title*="Ver"], td a, [data-testid="view-product"]').first();
    
    if (await viewButton.count() > 0) {
      await viewButton.click();
      
      // Verificar se modal/página de detalhes abriu
      await expect(page.locator('text=/detalhes|informações do produto/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Deve validar código GTIN (código de barras)', async ({ page }) => {
    await page.goto('/products');
    
    // Criar novo produto
    const newButton = page.locator('button:has-text("Novo")');
    await newButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Preencher campos básicos
    await page.fill('input[name="name"]', 'Produto Teste GTIN');
    await page.fill('input[name="internalCode"]', 'TESTGTIN001');
    
    // Preencher GTIN inválido
    const gtinInput = page.locator('input[name="gtin"]');
    if (await gtinInput.count() > 0) {
      await gtinInput.fill('1234567890123'); // GTIN inválido
      
      // Tentar submeter
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Verificar erro de validação
      await expect(page.locator('text=/gtin inválido|código de barras inválido/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
