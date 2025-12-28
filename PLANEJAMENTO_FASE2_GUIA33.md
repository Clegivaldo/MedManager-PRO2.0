# 🚀 FASE 2: Implementação de Guia 33 ANVISA

**Status:** ⏳ PRÓXIMO A INICIAR
**Prioridade:** CRÍTICA
**Tempo Estimado:** 3-4 dias

---

## 📋 O QUE É GUIA 33?

Guia 33 ANVISA define as regras para movimentação de medicamentos controlados (Portaria 344/98):

- Prescrições válidas por **máximo 30 dias** após emissão
- Quantidades máximas por substância por paciente/período
- Documentação obrigatória de todas operações
- Rastreabilidade completa (quem, quando, quanto, por quê)
- Repasse de informações à SNGPC (ANVISA)

---

## 🎯 Tarefas P2.1 - P2.4

### P2.1: Guia 33 Validation Service (Novo)
**Objetivo:** Criar serviço com validações de prescrição e quota

**Arquivo:** `api/src/services/guia33.service.ts` (NOVO)

**Funções necessárias:**
```typescript
// 1. Validar data de prescrição (máx 30 dias)
async validatePrescriptionDate(prescriptionDate: Date): Promise<{
  valid: boolean;
  daysRemaining: number;
  message: string;
}>;

// 2. Validar quota de substância
async validateSubstanceQuota(
  tenantId: string,
  substanceId: string,
  patientId: string,
  quantity: number,
  period: 'daily' | 'monthly' | 'yearly'
): Promise<{
  valid: boolean;
  quotaRemaining: number;
  message: string;
}>;

// 3. Registrar movimento de substância controlada
async recordSubstanceMovement(tenantId: string, data: SubstanceMovementDTO): Promise<void>;

// 4. Gerar relatório Guia 33
async generateGuia33Report(
  tenantId: string,
  substanceId: string,
  startDate: Date,
  endDate: Date
): Promise<Guia33Report>;
```

**Banco de Dados (já existe):**
- `ControlledSubstance` - Medicamento controlado
- `ControlledSubstanceMovement` - Cada movimento

**Exemplo de uso:**
```typescript
const service = new Guia33Service();

// Validar prescrição
const rxValidation = await service.validatePrescriptionDate(prescription.issuedAt);
if (!rxValidation.valid) {
  throw new Error('Prescription expired');
}

// Validar quota
const quotaValidation = await service.validateSubstanceQuota(
  tenantId,
  'substance-12345',
  'patient-67890',
  2,
  'monthly'
);
if (!quotaValidation.valid) {
  throw new Error(`Quota exceeded. Remaining: ${quotaValidation.quotaRemaining}`);
}

// Registrar movimento
await service.recordSubstanceMovement(tenantId, {
  substanceId: 'substance-12345',
  patientId: 'patient-67890',
  quantity: 2,
  prescriptionId: 'rx-11111',
  operationType: 'ISSUE', // ISSUE, RECEIVE, RETURN, LOSS
  registeredBy: req.user.userId,
  notes: 'Dispensed at pharmacy'
});
```

---

### P2.2: Endpoints Guia 33 Validation
**Objetivo:** Expor validações como API

**Arquivo:** `api/src/routes/guia33.routes.ts` (NOVO)

**Endpoints:**
```
POST   /api/v1/guia33/validate-prescription    → Validar prescrição
POST   /api/v1/guia33/validate-quota           → Validar quota
POST   /api/v1/guia33/record-movement          → Registrar movimento
GET    /api/v1/guia33/movements/:substanceId   → Histórico de movimentos
POST   /api/v1/guia33/generate-report          → Gerar relatório
```

**Controllers:** `api/src/controllers/guia33.controller.ts` (NOVO)

---

### P2.3: Integração com Product Management
**Objetivo:** Validar Guia 33 ao dispensar medicamentos

**Arquivo modificado:** `api/src/routes/product.routes.ts`

**Lógica:**
```
Quando usuário tenta dispensar medicamento:
  1. Verificar se é controlado (ControlledSubstance)
  2. Se SIM:
     - Validar prescrição (30 dias)
     - Validar quota (daily/monthly/yearly)
     - Registrar movimento no Guia 33
  3. Se NÃO:
     - Processar normalmente
```

---

### P2.4: Relatórios e Dashboard
**Objetivo:** Visualizar compliance com Guia 33

**Frontend:** `src/pages/tenant/Guia33Dashboard.tsx` (NOVO)

**Funcionalidades:**
- Listar medicamentos controlados
- Histórico de movimentos
- Alertas de prescrições expiradas
- Relatórios de quota utilizada
- Exportar dados para SNGPC

---

## 📊 Schema de Banco (já existe, mas vamos validar)

```prisma
// Medicamentos controlados
model ControlledSubstance {
  id String @id
  anvisaCode String // Código ANVISA
  name String
  dci String // Denominação Comum Internacional
  form String // Comprimido, líquido, injeção
  strength String // 5mg, 10mg, etc
  restrictions Json // { "daily": 2, "monthly": 30, "yearly": 300 }
  requiresPrescription Boolean
  prescriptionValidityDays Int? // Default: 30
  movementHistory ControlledSubstanceMovement[]
}

// Cada movimento (dispensação, devolução, perda)
model ControlledSubstanceMovement {
  id String @id
  substanceId String
  substance ControlledSubstance @relation(fields: [substanceId])
  patientId String // Paciente
  patientName String
  quantity Int
  prescriptionId String? // Se aplicável
  operationType String // ISSUE, RECEIVE, RETURN, LOSS, WASTE
  registeredBy String // User ID
  registeredAt DateTime @default(now())
  notes String?
  auditTrail Json? // Histórico de mudanças
}
```

---

## 🧪 Testes Necessários

### Teste 1: Prescrição Válida
```typescript
const rx = { issuedAt: new Date() };
const valid = await guia33Service.validatePrescriptionDate(rx.issuedAt);
// ✅ valid.valid === true
// ✅ valid.daysRemaining === 30
```

### Teste 2: Prescrição Expirada
```typescript
const rx = { issuedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) }; // 31 dias atrás
const valid = await guia33Service.validatePrescriptionDate(rx.issuedAt);
// ❌ valid.valid === false
// ✅ valid.message === 'Prescription expired'
```

### Teste 3: Quota OK
```typescript
const quota = await guia33Service.validateSubstanceQuota(
  tenantId, substanceId, patientId, 2, 'monthly'
);
// ✅ quota.valid === true
// ✅ quota.quotaRemaining >= 0
```

### Teste 4: Quota Excedida
```typescript
// Após registrar 30 unidades no mês
const quota = await guia33Service.validateSubstanceQuota(
  tenantId, substanceId, patientId, 5, 'monthly'
);
// ❌ quota.valid === false
// ✅ quota.quotaRemaining === 0
```

---

## 📋 Checklist de Implementação

- [ ] Criar `guia33.service.ts` com validações
- [ ] Implementar `validatePrescriptionDate()`
- [ ] Implementar `validateSubstanceQuota()`
- [ ] Implementar `recordSubstanceMovement()`
- [ ] Criar `guia33.routes.ts` com endpoints
- [ ] Criar `guia33.controller.ts`
- [ ] Integrar validação em product routes
- [ ] Criar `Guia33Dashboard.tsx`
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Documentação de uso
- [ ] Validar com SNGPC format

---

## 🔗 Dependências de FASE 1

✅ Backup system completo
- Dados podem ser salvos/restaurados
- Auditoria registra todas operações

✅ Permission system
- GUIA33_VIEW, GUIA33_MANAGE permissões

✅ Logging system
- Todos movimentos são auditados

---

## 💡 Próximos Passos

1. **Hoje:** Iniciar P2.1 (Guia33Service)
2. **Amanhã:** P2.2 (Endpoints)
3. **Dia 3:** P2.3 (Integração)
4. **Dia 4:** P2.4 (Dashboard) + Testes

---

## 📚 Referências

- Portaria 344/98 ANVISA (Medicamentos Controlados)
- Guia 33 ANVISA
- RDC 430/2020 (Distribuição)
- SNGPC Format (ANVISA)

---

**Próximo Passo:** Executar `Comece P2.1` para iniciar implementação

---

*Documento de Planejamento - FASE 2*
*Status: ⏳ Pronto para iniciar*
