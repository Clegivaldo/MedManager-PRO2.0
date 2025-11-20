# Testes E2E - MedManager PRO

## 📋 Visão Geral

Este diretório contém testes end-to-end (E2E) **self-contained** do sistema MedManager PRO. Os testes são **auto-suficientes** - criam seus próprios dados de teste durante a execução.

## ✨ Arquitetura Self-Contained

### 🎯 Por que Self-Contained?

Em um sistema **multi-tenant**, cada tenant tem seu próprio schema isolado. Não faz sentido depender de IDs fixos em `.env` que mudam a cada execução. 

**Solução**: Os testes criam seus próprios dados:
- ✅ Cliente de teste (criado no teste)
- ✅ Produto de teste (criado no teste)
- ✅ Lote de teste (criado no teste)
- ✅ Perfil fiscal (criado se não existir)
- ✅ **Sem dependência de seed data externo**

### 🔄 Fluxo do Teste

```
1. Login → Obtém CNPJ do tenant
2. Cria Cliente de teste
3. Cria Produto de teste
4. Cria Lote de teste
5. Verifica/Cria Perfil Fiscal
6. Cria NF-e com dados criados
7. Testa emissão, downloads, cancelamento
```

## 🎯 Escopo dos Testes

### Teste: `nfe-complete-flow.e2e.test.ts`

Cobre o ciclo de vida completo de uma NF-e:

1. **Autenticação** - Login e obtenção de CNPJ do tenant
2. **Criação de Dados** - Cliente, produto e lote de teste (auto-criados)
3. **Perfil Fiscal** - Validação ou criação de configurações
4. **Certificado Digital** - Verificação de certificado (opcional)
5. **Criação de Nota** - Rascunho de NF-e com dados criados
6. **Emissão SEFAZ** - Autorização na Receita (se certificado configurado)
7. **Consulta de Status** - Verificação de protocolo
8. **Download DANFE** - Geração do PDF (se autorizada)
9. **Download XML** - Download do XML (se autorizado)
10. **Cancelamento** - Evento de cancelamento (se autorizada)

## 🔧 Pré-requisitos

### 1. Ambiente Docker

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar se está rodando
docker ps
```

### 2. Apenas Usuário Master Necessário

Os testes precisam APENAS de:
- ✅ Usuário `admin@medmanager.com.br` com senha `admin123`
- ✅ Tenant associado (criado automaticamente no seed inicial)

**TUDO MAIS é criado pelo teste** (cliente, produto, lote, fiscal profile)

### 3. Configuração (Opcional)

Você pode criar `.env.test` para customizar (OPCIONAL):

```env
# API Configuration (opcional - padrão: http://localhost:3333/api/v1)
API_BASE_URL=http://localhost:3333/api/v1
```

**⚠️ NOTA**: Seed IDs e TENANT_CNPJ NÃO são mais necessários - os testes obtêm e criam tudo automaticamente!

## ▶️ Executando os Testes

### Executar todos os testes E2E

```bash
cd api
pnpm test
```

### Executar apenas o teste de NF-e

```bash
cd api
pnpm test nfe-complete-flow
```

### Com output verboso

```bash
cd api
pnpm test nfe-complete-flow -- --reporter=verbose
```

## 📊 Saída Esperada

### ✅ Cenário 1: Sem Certificado (Validação de Código)

```
✓ Login realizado com sucesso
  - Tenant: MedManager Demo
  - CNPJ: 12345678000155

✓ Cliente de teste criado
  - ID: 62ee4a4e-3fe4-4991-be69-580caa164afb
  - Nome: Cliente Teste E2E

✓ Produto de teste criado
  - ID: 85d1df2d-da39-43ee-8498-edf0c03249e2
  - Nome: Produto Teste E2E
  - Preço: R$ 25.5

✓ Lote de teste criado
  - ID: 615e9019-8b0d-4e8f-a513-5a77581aa23e
  - Número: LOTE-1700000000000
  - Quantidade: 100

✓ Perfil fiscal criado para testes

✓ Certificado não configurado (esperado para testes sem certificado)

✓ Nota fiscal criada com sucesso
  - Invoice ID: abc123...
  - Status: DRAFT

⚠️  Emissão pulada: certificado não configurado (esperado)
⚠️  Download DANFE pulado: nota não autorizada
⚠️  Download XML pulado: nota não autorizada
⚠️  Cancelamento pulado: nota não autorizada
```

### ✅ Cenário 2: Com Certificado (Fluxo Completo Real)

```
✓ Login realizado com sucesso
✓ Cliente de teste criado
✓ Produto de teste criado
✓ Lote de teste criado
✓ Perfil fiscal encontrado
✓ Certificado A1 válido
  - Válido até: 2025-12-31
  - Status: VALID

✓ Nota fiscal criada com sucesso

✓ NF-e emitida e autorizada na SEFAZ
  - Chave de acesso: 35231012345678000155550010000000011234567890
  - Protocolo: 123456789012345

✓ DANFE baixado com sucesso
  - Arquivo salvo: test-output/danfe-35231012345678000155.pdf
  - Tamanho: 48 KB

✓ XML baixado com sucesso
  - Arquivo salvo: test-output/nfe-35231012345678000155.xml
  - Contém tag <nfeProc>

✓ NF-e cancelada com sucesso
  - Status final: CANCELLED
```

## ❌ Troubleshooting

### 1. Erro: "Tenant not identified"

**Causa**: Usuário admin não tem tenant associado.

**Solução**:
```bash
# Verificar se o tenant existe no banco
docker exec -it db psql -U medmanager -d medmanager_master

SELECT id, name, cnpj FROM tenants;

# Se não existir, rodar seed inicial
cd api
pnpm prisma:seed
```

### 2. Erro: "Cannot create customer/product/batch"

**Causa**: Permissões do usuário ou problema de autenticação.

**Solução**:
```bash
# Verificar permissões do usuário admin
docker exec -it db psql -U medmanager -d medmanager_master

SELECT u.email, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.email = 'admin@medmanager.com.br';

# Admin deve ter role "MASTER_ADMIN" ou "ADMIN"
```

### 3. Erro: "Connection refused" ou "ECONNREFUSED"

**Causa**: API não está rodando.

**Solução**:
```bash
# Verificar se backend está up
docker ps | grep backend

# Ver logs do backend
docker logs backend

# Reiniciar se necessário
docker-compose restart backend
```

### 4. Testes de emissão falhando (401/403)

**Causa**: Certificado não configurado ou inválido.

**Solução**:
- Acesse `/fiscal-profile` e faça upload do certificado A1
- Ou aceite que os testes vão pular a emissão (comportamento esperado)
- Os testes ainda validam todo o código de estrutura

### 5. Timeout na emissão SEFAZ

**Causa**: SEFAZ lenta ou fora do ar.

**Solução**:
```bash
# Aumentar timeout no teste (já configurado para 60s)
# Ou verificar status da SEFAZ:
curl -X POST https://homologacao.nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx
```

## 📁 Arquivos Gerados

Os testes salvam arquivos em `api/test-output/`:

- `danfe-{chaveAcesso}.pdf` - DANFE gerado
- `nfe-{chaveAcesso}.xml` - XML autorizado
- Arquivos são sobrescritos a cada execução

## 🔐 Segurança

- ⚠️ Testes usam **ambiente de homologação** da SEFAZ
- ⚠️ Certificado A1 de teste recomendado (não usar certificado de produção)
- ✅ Dados de teste são criados com prefixo "Teste E2E"
- ✅ Testes NÃO impactam dados de produção

## 📚 Referências

- [NF-e 4.0 Manual](https://www.nfe.fazenda.gov.br/portal/principal.aspx)
- [Web Services SEFAZ](https://www.nfe.fazenda.gov.br/portal/webServices.aspx)
- [Vitest Documentation](https://vitest.dev/)

## 🤝 Contribuindo

Ao adicionar novos testes E2E:

1. Mantenha a abordagem **self-contained** (crie os dados no teste)
2. Use `describe` e `it` descritivos
3. Adicione logs para debugging (`console.log`)
4. Faça cleanup de dados criados (ou use soft delete)
5. Documente pré-requisitos específicos

## 📝 TODO

- [ ] Testes para NFC-e (Nota Fiscal do Consumidor)
- [ ] Testes para Carta de Correção
- [ ] Testes para Inutilização de Numeração
- [ ] Testes de performance (carga de emissões)
- [ ] Testes de integração com estoque (movimentação automática)
