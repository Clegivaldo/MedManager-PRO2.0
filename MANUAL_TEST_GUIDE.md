# 🧪 Guia de Testes Manuais - Modal de Cobrança

## 🚀 Início Rápido

### 1. Verificar se os Containers estão Rodando

```bash
docker ps
```

Deve mostrar:
- ✅ backend (healthy)
- ✅ frontend
- ✅ db (healthy)
- ✅ redis (healthy)

### 2. Acessar a Aplicação

**URL:** http://localhost:5173

Se receber erro de conexão, aguarde 10 segundos e atualize a página.

---

## 🔐 Login Superadmin

### Credenciais de Teste
| Campo | Valor |
|-------|-------|
| Email | admin@farmaciademo.com |
| Senha | admin123 |

### Passos
1. Página inicial carrega com formulário de login
2. Inserir: `admin@farmaciademo.com`
3. Inserir: `admin123`
4. Clicar: "Entrar"

**Resultado Esperado:**
- ✅ Redirecionamento para dashboard superadmin
- ✅ Menu superior mostra "Superadmin"
- ✅ Opção "Gerenciamento de Tenants" disponível

---

## 📋 Navegar para Lista de Tenants

### Via Menu
1. Clicar no menu hambúrguer (≡) no canto superior esquerdo
2. Selecionar "Tenants" ou "Gerenciamento de Tenants"

### Via URL Direta
```
http://localhost:5173/superadmin/tenants
```

**Resultado Esperado:**
- ✅ Página carrega com tabela de tenants
- ✅ Mínimo 3 tenants visíveis
- ✅ Colunas: Nome, CNPJ, Dias Restantes, Status, Ações

---

## 💳 Teste 1: Criar Cobrança PIX

### Passos

1. **Localizar um Tenant**
   - Procurar por: "Farmácia Demo"
   - Verificar se está "Ativo" (green badge)

2. **Abrir Modal de Cobrança**
   - Na coluna "Ações", encontrar o botão com ícone de cartão de crédito (roxo/purple)
   - Clicar no botão

3. **Modal Aparece**
   - Título: "Criar Cobrança - Farmácia Demo"
   - Três campos visíveis:
     - Valor (R$) - campo numérico
     - Método de Pagamento - dropdown
     - Descrição - campo texto

4. **Preencher Valor**
   - Clicar no campo "Valor (R$)"
   - Digitar: `5.00`
   - ✅ **VERIFICAR PERSISTÊNCIA:** Valor deve permanecer no campo

5. **Selecionar Método**
   - Clicar no dropdown "Método de Pagamento"
   - Selecionar: "PIX"
   - Verificar que PIX está selecionado (sem mudar)

6. **Adicionar Descrição (Opcional)**
   - Clicar no campo "Descrição"
   - Digitar: `Teste de Cobrança PIX`
   - Verificar que o texto persiste

7. **Criar Cobrança**
   - Clicar no botão verde "Criar Cobrança"
   - Aguardar resposta do servidor (2-3 segundos)

### Resultado Esperado ✅

**Tela muda para:**
- ✅ Mensagem verde: "✓ Cobrança criada com sucesso"
- ✅ Charge ID exibido (ex: `pay_zt9oq9134xv30yvx`)
- ✅ Status: `pending`
- ✅ Data de vencimento: `2025-11-26`
- ✅ **QR Code PIX** exibido como imagem
- ✅ Código PIX abaixo do QR Code

**Botão:** "Fechar" disponível

### Como Testar o QR Code
1. Abrir câmera do telefone
2. Apontar para o QR Code na tela
3. Link do Asaas deve aparecer

---

## 💳 Teste 2: Criar Cobrança BOLETO

### Passos (similar ao PIX)

1. **Abrir modal novamente** (clique no botão de cartão)
   - ✅ Campos devem estar vazios (reset funcionou)

2. **Preencher Formulário**
   - Valor: `10.00`
   - Método: "Boleto" (selecionar dropdown)
   - Descrição: `Teste de Cobrança Boleto`

3. **Verificar Persistência**
   - Mudar foco entre campos
   - Valores devem permanecer
   - Clicar em dropdown e fechar
   - Boleto deve permanecer selecionado

4. **Criar Cobrança**
   - Clicar "Criar Cobrança"

### Resultado Esperado ✅

**Diferença do PIX:**
- ✅ Em vez de QR Code, exibir:
- ✅ Botão: "Abrir PDF do Boleto" (azul claro)
- ✅ Número do boleto abaixo
- ✅ Link em `https://sandbox.asaas.com/...`

**Testar Botão:**
1. Clicar "Abrir PDF do Boleto"
2. Deve abrir em nova aba
3. URL será do Asaas sandbox
4. PDF do boleto pode ser exibido ou baixado

---

## 🔄 Teste 3: Validação de Inputs

### Teste 3.1: Valor Mínimo ❌ 5,00

**Passo 1:** Tentar inserir valor abaixo do mínimo
1. Abrir modal de cobrança
2. Inserir valor: `1.00`
3. Clicar "Criar Cobrança"

**Resultado Esperado:**
- ❌ Toast de erro vermelho
- ❌ Mensagem: "Informe um valor válido"
- Modal permanece aberta

### Teste 3.2: Valor Zero

**Passo 2:** Tentar inserir valor zero
1. Campo "Valor": `0`
2. Clicar "Criar Cobrança"

**Resultado Esperado:**
- ❌ Toast de erro

### Teste 3.3: Valor Negativo

**Passo 3:** Tentar inserir valor negativo
1. Campo "Valor": `-5`
2. Clicar "Criar Cobrança"

**Resultado Esperado:**
- ❌ Toast de erro
- ❌ Campo pode rejeitar entrada (validação HTML)

---

## 🔄 Teste 4: Reset de Formulário

### Passo 1: Abrir e Fechar (Cancel)
1. Abrir modal de cobrança
2. Inserir: Valor=5, Método=BOLETO, Descrição=Teste
3. Clicar "Cancelar" (botão cinza)
4. Abrir modal novamente

**Resultado Esperado:**
- ✅ Campos todos vazios
- ✅ Método volta a PIX (padrão)
- ✅ Nenhum resultado anterior exibido

### Passo 2: Abrir e Fechar (Após Sucesso)
1. Criar uma cobrança com sucesso
2. Tela mostra resultado (QR Code/Boleto)
3. Clicar "Fechar"
4. Abrir modal novamente

**Resultado Esperado:**
- ✅ Campos todos vazios
- ✅ Formulário de criação exibido (não resultado)
- ✅ Estado limpo completamente

---

## 📊 Teste 5: Múltiplas Cobranças Consecutivas

### Objetivo
Verificar se o componente mantém estado correto em múltiplas operações

### Passos
1. Criar cobrança 1: R$ 5.00 | PIX | Descrição=Teste1
2. Fechar modal
3. Criar cobrança 2: R$ 7.50 | BOLETO | Descrição=Teste2
4. Fechar modal
5. Criar cobrança 3: R$ 10.00 | PIX | Descrição=Teste3

**Resultado Esperado:**
- ✅ Cada cobrança criada com sucesso
- ✅ Charge IDs diferentes
- ✅ Métodos corretos (PIX/BOLETO) por cobrança
- ✅ Nenhuma mistura de dados entre operações
- ✅ Nenhum erro de estado

---

## 🐛 Teste 6: Debug & Logs

### Abrir Developer Tools
1. Pressionar F12
2. Ir para aba "Console"
3. Abrir modal de cobrança
4. Inserir valor e observar

**Logs Esperados:**
```javascript
// Ao digitar valor
Amount changed: 5
Amount changed: 5.0
Amount changed: 5.00

// Ao clicar em dropdown
// (sem erro de React)
```

### Verificar Rede
1. Abrir aba "Network"
2. Criar cobrança
3. Procurar requisição:
   - `POST /api/v1/superadmin/tenants/.../create-charge`
   - Status: `200` ✅
   - Response: contém `chargeId`, `pixQrCodeBase64` ou `boletoUrl`

---

## ✅ Checklist Final de Testes

### Funcionalidade Básica
- [ ] Login superadmin funciona
- [ ] Lista de tenants carrega
- [ ] Botão de cobrança aparece em cada tenant
- [ ] Modal abre corretamente

### Persistência de Valores
- [ ] Valor inserido persiste ao digitar
- [ ] Método selecionado persiste
- [ ] Descrição persiste
- [ ] Reset funciona após sucesso

### Criação de Cobrança
- [ ] PIX criado com sucesso
- [ ] BOLETO criado com sucesso
- [ ] QR Code PIX exibido
- [ ] URL boleto exibido
- [ ] Charge ID retornado

### Validação
- [ ] Erro ao inserir valor < 5.00
- [ ] Erro ao inserir valor 0
- [ ] Rejeição de valores negativos

### Fluxo de Vida
- [ ] Abrir → Fechar limpa campos
- [ ] Múltiplas cobranças funcionam
- [ ] Nenhum vazamento de estado

### Performance
- [ ] Modal abre rapidamente (< 100ms)
- [ ] Digitação é responsiva (sem lag)
- [ ] Requisição de cobrança < 3 segundos

---

## 📱 Teste em Mobile/Tablet

1. Abrir em navegador mobile ou DevTools (F12 → Toggle Device)
2. Viewport: 768px ou menor
3. Verificar:
   - [ ] Modal responsiva
   - [ ] Campos acessíveis
   - [ ] Teclado não cobre inputs
   - [ ] Botões clicáveis

---

## 🆘 Solução de Problemas

### Erro: "Tenant não encontrado"
- Verificar se está usando um tenant existente
- Executar: `npx tsx list-tenants.ts`
- Usar um tenant da lista

### Erro: "Valor abaixo do mínimo (R$ 5,00)"
- Asaas sandbox requer mínimo R$ 5,00
- Inserir valor >= 5.00

### Modal não abre
- Verificar console do navegador (F12)
- Verificar se está em página de Tenants
- Recarregar página (F5)

### QR Code não aparece
- Verificar status da resposta (Network tab)
- `pixQrCodeBase64` deve estar na resposta
- Pode demorar 2-3 segundos para renderizar

### Valores não persistem
- Verificar se há erros no console (F12)
- Executar rebuild: `docker compose restart frontend`
- Limpar cache: Ctrl+F5

---

## 📝 Notas Importantes

1. **Valor Mínimo:** Asaas Sandbox exige R$ 5,00 mínimo
2. **Sandbox:** Todos os testes usam ambiente Asaas Sandbox
3. **TTL:** Cobranças expiram em 7 dias (configurável)
4. **Webhook:** Em desenvolvimento, use `test-asaas-integration.ts` para simular

---

**✅ Testes completados com sucesso = Sistema pronto para produção (com ajustes de webhook e credenciais reais)**
