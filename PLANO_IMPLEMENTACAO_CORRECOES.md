# 🔧 PLANO DE IMPLEMENTAÇÃO & CORREÇÕES - MedManager-PRO 2.0

**Prioridade:** CRÍTICA → ALTA → MÉDIA  
**Estimativa:** 2-3 semanas para completar tudo  

---

## FASE 1: BACKUP ROBUSTO (1-2 dias) 🔴 CRÍTICO

### O que está pronto:
- ✅ Rotas de backup em `api/src/routes/backup.routes.ts` (POST, GET, DELETE)
- ✅ Script bash para pg_dump em `docker/backup/backup.sh`
- ✅ Job de limpeza automática em `jobs/backupCleanup.job.js`

### O que falta:
- ❌ Endpoint de **download** de backup
- ❌ Criptografia de backups
- ❌ Validação de integridade (checksum)
- ❌ Testes de backup/restore

### Implementação:

#### 1.1 Adicionar endpoint de DOWNLOAD (5min)

Arquivo: `api/src/routes/backup.routes.ts` - Adicionar após linha 110:

```typescript
// Download backup
router.get('/download/:tenantId/:backupFileName', authenticateToken, requirePermissions([PERMISSIONS.BACKUP_DOWNLOAD]), async (req, res, next) => {
  try {
    const { tenantId, backupFileName } = req.params;
    if (!tenantId || !backupFileName) throw new AppError('TenantId and backupFileName required', 400);

    const tenant = await prismaMaster.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant not found', 404);

    const backupPath = path.join(process.cwd(), 'backups', tenantId, backupFileName);
    
    // Security: Prevent path traversal
    const realPath = path.resolve(backupPath);
    const allowedDir = path.resolve(path.join(process.cwd(), 'backups', tenantId));
    if (!realPath.startsWith(allowedDir)) {
      throw new AppError('Invalid backup file', 400);
    }

    // Check file exists
    if (!fsSync.existsSync(backupPath)) {
      throw new AppError('Backup file not found', 404);
    }

    // Set download headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
    
    // Stream file
    const stream = fsSync.createReadStream(backupPath);
    stream.pipe(res);

    stream.on('error', (error) => {
      logger.error('Stream error during backup download', { tenantId, backupFileName, error: error.message });
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Error downloading backup' });
      }
    });
  } catch (error) {
    next(error);
  }
});
```

#### 1.2 Adicionar criptografia de backups (15min)

Arquivo: `api/src/utils/encryption.ts` - Já existe! Usar `encrypt()` e `decrypt()`

Arquivo: `api/src/routes/backup.routes.ts` - Modificar backup completo:

```typescript
// Line 75 - Adicionar após comprimir
if (fsSync.existsSync(zipFile)) {
  // Criptografar backup
  const encrypted = encrypt(fsSync.readFileSync(zipFile).toString('base64'));
  fsSync.writeFileSync(zipFile + '.enc', encrypted);
  fsSync.unlinkSync(zipFile);
  logger.info('Backup encrypted', { tenantId, file: zipFile + '.enc' });
}
```

#### 1.3 Adicionar checksum de integridade (10min)

```typescript
// Após criar arquivo de backup
const crypto = require('crypto');
const fileStream = fsSync.createReadStream(backupPath);
const hash = crypto.createHash('sha256');

fileStream.on('data', data => hash.update(data));
fileStream.on('end', () => {
  const checksum = hash.digest('hex');
  fsSync.writeFileSync(backupPath + '.sha256', checksum);
  logger.info('Backup checksum created', { tenantId, checksum });
});
```

#### 1.4 Teste de Backup/Restore (Manual - 30min)

Script: `test-backup-restore.sh`

```bash
#!/bin/bash

# 1. Criar backup
curl -X POST http://localhost:3333/api/v1/backup/db/{tenantId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"

# 2. Listar backups
curl -X GET http://localhost:3333/api/v1/backup/list/{tenantId} \
  -H "Authorization: Bearer {token}"

# 3. Download backup
curl -X GET http://localhost:3333/api/v1/backup/download/{tenantId}/{filename} \
  -H "Authorization: Bearer {token}" \
  -o ./backup.sql.gz.enc

# 4. Restaurar em DB temporário
docker exec -it medmanager-postgres psql -U postgres -c "CREATE DATABASE test_restore;"
docker exec -it medmanager-postgres psql -d test_restore < backup.sql

# 5. Validar dados restaurados
docker exec -it medmanager-postgres psql -d test_restore -c "SELECT COUNT(*) FROM products;"
```

---

## FASE 2: GUIA 33 & RDC 430 COMPLIANCE (3-4 dias) 🔴 CRÍTICO

### Status Atual:
- ✅ Estrutura de dados (ControlledSubstance, ControlledSubstanceMovement)
- ✅ Geração de relatório
- ❌ Validação de receitas (data, assinatura)
- ❌ Controle de quotas
- ❌ Envio à ANVISA

### Implementação:

#### 2.1 Validação de Receita (30min)

Arquivo: `api/src/services/guia33.service.ts` (NOVO)

```typescript
import { AppError } from '../middleware/errorHandler.js';

export class Guia33Service {
  /**
   * Validar receita controlada
   */
  validatePrescription(prescription: {
    number: string;
    date: Date;
    doctorCrm: string;
    doctorCrmState: string;
    patientName: string;
    patientCpf: string;
    substances: Array<{ code: string; quantity: number }>;
  }) {
    const errors: string[] = [];

    // 1. Formato de número
    if (!prescription.number || prescription.number.length < 10) {
      errors.push('Prescription number format invalid');
    }

    // 2. Data não pode ser > 30 dias (Portaria 344/98, Art. 72)
    const today = new Date();
    const prescriptionDate = new Date(prescription.date);
    const daysOld = Math.floor((today.getTime() - prescriptionDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOld > 30) {
      errors.push(`Prescription is ${daysOld} days old. Maximum allowed: 30 days`);
    }

    // 3. Validar CRM doctor (formato UF + número)
    if (!prescription.doctorCrmState || prescription.doctorCrmState.length !== 2) {
      errors.push('Invalid CRM state code');
    }

    // 4. CPF paciente (validação básica)
    if (!this.validateCPF(prescription.patientCpf)) {
      errors.push('Invalid patient CPF');
    }

    // 5. Quantidade dentro dos limites permitidos
    for (const substance of prescription.substances) {
      if (substance.quantity <= 0) {
        errors.push(`Invalid quantity for substance ${substance.code}`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(errors.join('; '), 400);
    }

    return true;
  }

  /**
   * Validar quota de substância controlada
   */
  async validateSubstanceQuota(
    substanceId: string,
    requestedQuantity: number,
    prisma: any
  ) {
    // Buscar movimentações do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const movements = await prisma.controlledSubstanceMovement.findMany({
      where: {
        substanceId,
        movementDate: { gte: startOfMonth },
        movementType: { in: ['VENDA', 'SAIDA'] } // Apenas saídas
      }
    });

    const totalUsed = movements.reduce((sum, m) => sum + m.quantity, 0);

    // Quota mensal padrão (pode variar por CRF)
    const monthlyQuota = 1000; // Exemplo: ajustar conforme política

    if (totalUsed + requestedQuantity > monthlyQuota) {
      throw new AppError(
        `Substance quota exceeded. Used: ${totalUsed}, Requested: ${requestedQuantity}, Quota: ${monthlyQuota}`,
        409
      );
    }

    return true;
  }

  /**
   * Validar CPF (algoritmo oficial)
   */
  private validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;

    let sum = 0;
    let remainder;

    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    // Segundo dígito verificador
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  }
}

export const guia33Service = new Guia33Service();
```

#### 2.2 Aplicar validação na venda (20min)

Arquivo: `api/src/routes/invoice.routes.ts` - Modificar endpoint de criar invoice:

```typescript
// POST /invoices (antes de criar)
if (controlledSubstances.length > 0) {
  for (const item of controlledSubstances) {
    // Validar receita
    await guia33Service.validatePrescription(item.prescription);
    
    // Validar quota
    await guia33Service.validateSubstanceQuota(
      item.productId,
      item.quantity,
      prisma
    );
  }
}
```

#### 2.3 RDC 430 - Validações (30min)

Arquivo: `api/src/services/rdc430.service.ts` (NOVO)

```typescript
export class RDC430Service {
  /**
   * Validar se medicamento está conforme RDC 430
   */
  validateMedicineCompliance(product: any): {
    compliant: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // 1. Deve ter código ANVISA
    if (!product.anvisaCode) {
      issues.push('Missing ANVISA registration code');
    }

    // 2. Deve ter classe terapêutica
    if (!product.therapeuticClass) {
      issues.push('Missing therapeutic class');
    }

    // 3. Lote + validade obrigatória
    if (!product.batches || product.batches.length === 0) {
      issues.push('No valid batches');
    } else {
      for (const batch of product.batches) {
        if (new Date(batch.expirationDate) < new Date()) {
          issues.push(`Batch ${batch.batchNumber} is expired`);
        }
      }
    }

    // 4. Se controlado, precisa de requisitos especiais
    if (product.isControlled) {
      if (!product.stripe) {
        issues.push('Controlled substance must declare stripe/listing');
      }
    }

    // 5. Se requer controle de temperatura
    if (product.storage) {
      const temp = JSON.parse(product.storage);
      if (!temp.temperature || !temp.temperature.min || !temp.temperature.max) {
        issues.push('Temperature range required for cold-chain products');
      }
    }

    return {
      compliant: issues.length === 0,
      issues
    };
  }

  /**
   * Gerar relatório de conformidade RDC 430 para auditoria
   */
  async generateComplianceReport(tenantId: string, prisma: any) {
    const products = await prisma.product.findMany({
      include: { batches: true, stock: true }
    });

    const nonCompliant = products.filter(p => {
      const validation = this.validateMedicineCompliance(p);
      return !validation.compliant;
    });

    return {
      totalProducts: products.length,
      compliantProducts: products.length - nonCompliant.length,
      nonCompliant: nonCompliant.map(p => ({
        id: p.id,
        name: p.name,
        issues: this.validateMedicineCompliance(p).issues
      })),
      generatedAt: new Date(),
      generatedBy: 'system'
    };
  }
}
```

---

## FASE 3: NF-e REAL (3-4 dias) 🟡 ALTA

### Problema:
- NF-e atualmente é mock (não assina XML, não valida com Sefaz)

### Solução:

#### 3.1 Integrar biblioteca real

```bash
cd api
npm install @nfe-sefaz/core @nfe-sefaz/assinador
```

#### 3.2 Criar serviço de NF-e real

Arquivo: `api/src/services/nfe-real.service.ts`

```typescript
import { SignerX509 } from '@nfe-sefaz/assinador';
import { NFeAPI } from '@nfe-sefaz/core';

export class NFERealService {
  async issueNFe(nfeData: any, certificate: any) {
    // 1. Assinar XML
    const signer = new SignerX509();
    const signedXML = await signer.sign(
      nfeData.xml,
      certificate.path,
      certificate.password
    );

    // 2. Enviar à Sefaz
    const nfeAPI = new NFeAPI({
      environment: nfeData.environment, // 'homolog' ou 'prod'
      uf: nfeData.uf,
      timeout: 30000
    });

    const result = await nfeAPI.sendNFe(signedXML);

    // 3. Retornar resultado
    return {
      success: result.cStat === 100,
      protocolNumber: result.infProt?.nProt,
      accessKey: result.infDoc?.chNFe,
      xml: result.xml
    };
  }
}
```

#### 3.3 Exemplo de uso na rota

```typescript
// POST /api/v1/fiscal/nfe/emit/:invoiceId
const nfeService = new NFERealService();
const result = await nfeService.issueNFe(xmlData, certificateInfo);

if (result.success) {
  // Salvar protocolo no banco
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      nfe: {
        status: 'emitted',
        protocolNumber: result.protocolNumber,
        accessKey: result.accessKey,
        xml: result.xml
      }
    }
  });
}
```

---

## FASE 4: TESTES E2E (2-3 dias) 🟡 ALTA

### O que testar:

#### 4.1 Criar suite de testes

Arquivo: `api/src/tests/e2e.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const API = 'http://localhost:3333/api/v1';
let token: string;
let tenantId: string;

describe('E2E Tests - MedManager', () => {
  beforeAll(async () => {
    // Login como superadmin
    const res = await axios.post(`${API}/auth/login`, {
      email: 'admin@medmanager.com.br',
      password: 'admin123'
    });
    token = res.data.data.tokens.accessToken;
  });

  describe('Tenant Management', () => {
    it('should create a new tenant', async () => {
      const res = await axios.post(
        `${API}/superadmin/tenants`,
        {
          name: 'Test Tenant',
          cnpj: '12.345.678/0001-99',
          plan: 'starter'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.tenant.id).toBeDefined();
      tenantId = res.data.tenant.id;
    });

    it('should list tenants', async () => {
      const res = await axios.get(`${API}/superadmin/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(res.status).toBe(200);
      expect(res.data.tenants.length).toBeGreaterThan(0);
    });
  });

  describe('Backup', () => {
    it('should create a backup', async () => {
      const res = await axios.post(
        `${API}/backup/db/${tenantId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.file).toBeDefined();
    });

    it('should list backups', async () => {
      const res = await axios.get(`${API}/backup/list/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.items)).toBe(true);
    });

    it('should download backup', async () => {
      const listRes = await axios.get(`${API}/backup/list/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filename = listRes.data.items[0].name;

      const res = await axios.get(
        `${API}/backup/download/${tenantId}/${filename}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'stream'
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('Guia 33 - Controlled Substances', () => {
    it('should validate prescription', async () => {
      const prescription = {
        number: 'RX123456789',
        date: new Date(),
        doctorCrm: '123456',
        doctorCrmState: 'SP',
        patientName: 'John Doe',
        patientCpf: '12345678901'
      };

      // Espera uma validação de prescrição
      // Implementation pending
    });
  });

  afterAll(async () => {
    // Cleanup
  });
});
```

#### 4.2 Rodar testes

```bash
cd api
pnpm test:e2e
```

---

## FASE 5: VALIDAÇÃO DE SOFTWARE (1-2 dias) 📋

Para atender RUP/Validação de Software conforme ANVISA:

### 5.1 Documentação Formal

Arquivo: `VALIDATION_PLAN.md`

```markdown
# Software Validation Plan - MedManager-PRO 2.0

## 1. Escopo
- Plataforma SaaS para distribuição de medicamentos
- Conformidade: RDC 430, RDC 301, Portaria 344
- Ambiente: Cloud (VPS) + Docker

## 2. Requisitos Críticos
- [REQ-001] Isolamento de dados multi-tenant
- [REQ-002] Rastreabilidade RDC 430
- [REQ-003] Guia 33 completa
- [REQ-004] Backup/Restore funcional
- [REQ-005] Auditoria imutável

## 3. Testes Executados
- [TEST-001] Backup/Restore de cada tenant
- [TEST-002] Isolamento de dados entre tenants
- [TEST-003] Validação de receita Guia 33
- [TEST-004] RDC 430 compliance

## 4. Evidências
[Anexar screenshots, logs, certificados]
```

### 5.2 Rastreabilidade Requisitos → Código

```
REQ-001: Isolamento multi-tenant
  ↓
api/src/middleware/tenantMiddleware.ts (linha 15-30)
api/src/lib/prisma.ts (pool de conexões)
  ↓
TEST-001: Criar 2 tenants, inserir dados diferentes, validar isolamento
  ↓
EVIDÊNCIA: test-isolation.log
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

### ✅ Pronto
- [x] Multi-tenancy database-per-tenant
- [x] Autenticação JWT
- [x] Permissões granulares
- [x] Gerenciamento de tenants (superadmin)
- [x] Planos e módulos
- [x] RDC 430 estrutura
- [x] Guia 33 estrutura

### 🔄 Em Progresso
- [ ] Endpoints de backup/download
- [ ] Criptografia de backups
- [ ] Validação de receita Guia 33
- [ ] Quota controle
- [ ] NF-e real

### ❌ Faltando
- [ ] Testes E2E automatizados
- [ ] Documentação de validação software
- [ ] Integração real ANVISA (SNGPC)
- [ ] Alertas de validade
- [ ] Two-Factor Auth completo

---

## COMO EXECUTAR AS IMPLEMENTAÇÕES

### Dia 1-2: Backup
```bash
# 1. Editar api/src/routes/backup.routes.ts
# 2. Adicionar download endpoint
# 3. Testar manualmente
curl -X GET http://localhost:3333/api/v1/backup/download/{tenantId}/{filename} \
  -H "Authorization: Bearer $TOKEN" \
  -o backup.sql.gz
```

### Dia 3-4: Guia 33
```bash
# 1. Criar api/src/services/guia33.service.ts
# 2. Implementar validações
# 3. Integrar nas rotas de invoice
# 4. Testar
```

### Dia 5-6: NF-e
```bash
# 1. npm install @nfe-sefaz/core
# 2. Criar NFERealService
# 3. Integrar no fiscal.routes.ts
```

### Dia 7-8: Testes
```bash
# 1. Criar api/src/tests/e2e.test.ts
# 2. pnpm test:e2e
```

---

## ESTIMATIVA FINAL

| Fase | Dias | Status |
|------|------|--------|
| 1. Backup | 1-2 | 🔴 CRÍTICO |
| 2. Guia 33 | 3-4 | 🔴 CRÍTICO |
| 3. NF-e | 3-4 | 🟡 ALTA |
| 4. Testes E2E | 2-3 | 🟡 ALTA |
| 5. Validação | 1-2 | 📋 MÉDIA |
| **TOTAL** | **10-15 dias** | |

---

**Próximas Ações (Hoje):**
1. [ ] Implementar endpoint de download de backup
2. [ ] Criar testes de backup/restore
3. [ ] Iniciar implementação Guia 33

**Status:** Pronto para iniciar implementação
