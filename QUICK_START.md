# 🚀 Guia Rápido de Instalação

## Passo 1: Executar Setup Automatizado

### Windows:
```bash
setup.bat
```

### Linux/Mac:
```bash
chmod +x setup.sh
./setup.sh
```

O script irá:
- ✅ Instalar todas as dependências
- ✅ Criar diretórios necessários
- ✅ Gerar cliente Prisma
- ✅ Executar migrations

## Passo 2: Configurar Variáveis de Ambiente

1. Copie o conteúdo de `ENV_TEMPLATE.txt`
2. Cole no seu arquivo `.env`
3. Gere uma chave de criptografia:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Substitua `your-32-character-encryption-key-here-replace-this` pela chave gerada

## Passo 3: Registrar Rotas

Abra o arquivo principal da API e siga as instruções em `REGISTER_ROUTES.txt`

## Passo 4: Atualizar Prisma Schema

Siga as instruções em `PRISMA_SCHEMA_UPDATE.md` para adicionar o modelo `TenantSettings`

## Passo 5: Testar

1. Reinicie o servidor backend
2. Acesse as páginas:
   - `/tenant/settings`
   - `/tenant/users`
   - `/tenant/nfe`
   - `/tenant/audit`
   - `/tenant/financials`

## ✅ Pronto!

Todas as páginas devem estar funcionando com integração completa!
