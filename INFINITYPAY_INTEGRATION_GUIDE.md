# Guia de Integração InfinityPay

## Status Atual
⚠️ **IMPLEMENTAÇÃO HIPOTÉTICA** - Requer validação com documentação oficial

A implementação atual do InfinityPayGateway foi criada com base em suposições sobre a estrutura da API. **Não deve ser usada em produção sem validação completa.**

## Checklist de Validação

### 1. Credenciais
- [ ] Obter API Key de sandbox
- [ ] Obter Secret Key de sandbox  
- [ ] Validar método de autenticação (Bearer token + X-Secret-Key?)
- [ ] Testar autenticação em sandbox

### 2. Endpoints
- [ ] Validar base URL de sandbox
- [ ] Validar base URL de produção
- [ ] Validar endpoint de criação de cobrança (`POST /charges`?)
- [ ] Validar endpoint de consulta de status (`GET /charges/:id`?)
- [ ] Validar endpoint de cancelamento (`DELETE /charges/:id`?)

### 3. Estrutura de Dados

#### Request de Criação de Cobrança
Estrutura atual (HIPOTÉTICA):
```json
{
  "amount": 10000,
  "payment_method": "pix",
  "description": "Descrição",
  "customer": {
    "name": "Nome",
    "email": "email@example.com",
    "document": "12345678900",
    "phone": "11999999999"
  },
  "metadata": {
    "tenantId": "..."
  }
}
```

- [ ] Validar campos obrigatórios
- [ ] Validar formato de valores (centavos vs reais)
- [ ] Validar nomes de campos (snake_case vs camelCase)
- [ ] Validar estrutura de customer
- [ ] Validar suporte a metadata

#### Response de Criação
Estrutura atual (HIPOTÉTICA):
```json
{
  "id": "charge_id",
  "status": "PENDING",
  "amount": 10000,
  "payment_link": "https://...",
  "pix_qrcode": "00020126...",
  "pix_qrcode_base64": "iVBORw0KGgo..."
}
```

- [ ] Validar estrutura de resposta
- [ ] Validar formato de PIX QR Code
- [ ] Validar formato de boleto (se suportado)

### 4. Códigos de Status
Mapeamento atual (HIPOTÉTICO):
- `PENDING` → pending
- `PAID` / `CONFIRMED` → confirmed
- `EXPIRED` → overdue
- `CANCELED` → cancelled
- `REFUNDED` → refunded

- [ ] Validar todos os status possíveis
- [ ] Validar transições de status
- [ ] Validar status de erro

### 5. Testes em Sandbox

#### Teste 1: Criar Cobrança PIX
```bash
# Ajustar conforme documentação real
curl -X POST https://sandbox.infinitypay.com/v1/charges \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Secret-Key: YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "payment_method": "pix",
    "description": "Teste",
    "customer": {
      "name": "Teste",
      "email": "teste@example.com",
      "document": "12345678900"
    }
  }'
```

- [ ] Executar teste
- [ ] Validar resposta
- [ ] Validar QR Code gerado

#### Teste 2: Consultar Status
```bash
curl -X GET https://sandbox.infinitypay.com/v1/charges/CHARGE_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Secret-Key: YOUR_SECRET_KEY"
```

- [ ] Executar teste
- [ ] Validar resposta

#### Teste 3: Cancelar Cobrança
```bash
curl -X DELETE https://sandbox.infinitypay.com/v1/charges/CHARGE_ID \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Secret-Key: YOUR_SECRET_KEY"
```

- [ ] Executar teste
- [ ] Validar resposta

#### Teste 4: Webhook (se disponível)
- [ ] Configurar URL de webhook
- [ ] Validar estrutura de payload
- [ ] Validar autenticação de webhook
- [ ] Testar recebimento de notificações

### 6. Ajustes Necessários no Código

Após validação, ajustar em `InfinityPayGateway.ts`:

```typescript
// Linha 14: Validar base URL
this.baseUrl = config.baseUrl || 'https://api.infinitypay.com/v1';

// Linhas 17-22: Validar headers de autenticação
private getHeaders() {
  return {
    'Authorization': `Bearer ${this.config.apiKey}`,
    'X-Secret-Key': this.config.secretKey,
    'Content-Type': 'application/json',
  };
}

// Linhas 25-36: Validar mapeamento de status
private mapStatus(status: string): PaymentStatus {
  switch (status?.toUpperCase()) {
    case 'PENDING': return 'pending';
    case 'PAID':
    case 'CONFIRMED': return 'confirmed';
    // ... ajustar conforme documentação
  }
}

// Linhas 38-77: Validar estrutura de payload e response
async createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
  const payload = {
    // Ajustar campos conforme documentação
  };
  
  const response = await axios.post(`${this.baseUrl}/charges`, payload, {
    headers: this.getHeaders()
  });
  
  // Ajustar mapeamento de resposta
}
```

### 7. Produção

- [ ] Obter credenciais de produção
- [ ] Atualizar base URL para produção
- [ ] Configurar variáveis de ambiente:
  ```
  INFINITYPAY_API_KEY=prod_key
  INFINITYPAY_SECRET_KEY=prod_secret
  INFINITYPAY_BASE_URL=https://api.infinitypay.com/v1
  ```
- [ ] Testes finais em produção com valores baixos
- [ ] Monitorar primeiras transações

## Documentação Necessária

Para completar a integração, solicite à InfinityPay:

1. **Manual da API**
   - Guia de início rápido
   - Referência completa de endpoints
   - Exemplos de request/response

2. **Autenticação**
   - Método de autenticação
   - Como obter credenciais
   - Rotação de chaves

3. **Webhooks**
   - URL de configuração
   - Estrutura de payload
   - Método de autenticação
   - Eventos disponíveis

4. **Códigos de Erro**
   - Lista completa de códigos
   - Significado de cada código
   - Como tratar cada erro

5. **Suporte**
   - Canal de suporte técnico
   - SLA de resposta
   - Contato para emergências

## Contato InfinityPay

- **Site:** https://www.infinitypay.io
- **Suporte:** Verificar no site oficial
- **Documentação:** Solicitar acesso ao portal de desenvolvedores

## Notas Importantes

⚠️ **CRÍTICO:** Não use esta implementação em produção sem validar TODOS os itens acima.

✅ **RECOMENDAÇÃO:** Mantenha a implementação do Asaas como gateway principal até que a integração InfinityPay seja totalmente validada e testada.

📝 **LEMBRETE:** Atualize este documento conforme for validando cada item do checklist.
