# Configuração de Email - MedManager-PRO

## Visão Geral
O sistema de recuperação de senha utiliza Nodemailer para enviar emails com tokens de reset. Por padrão, em modo de desenvolvimento, os emails são apenas logados no console.

## Modo de Desenvolvimento (Padrão)
Quando não há configuração SMTP no `.env`, o sistema:
- Loga o email que seria enviado no console do backend
- Retorna o token no response (apenas em `NODE_ENV !== 'production'`)
- Permite testar o fluxo completo sem servidor de email

**Como testar:**
1. Acesse `/forgot-password`
2. Informe um email válido cadastrado
3. Veja o token no console do backend ou no response (campo `dev.token`)
4. Use o token em `/reset-password?token=SEU_TOKEN`

## Configuração de Produção

### Opção 1: Gmail (Recomendado para testes)

1. Ative a verificação em 2 etapas na sua conta Google
2. Gere uma senha de aplicativo em: https://myaccount.google.com/apppasswords
3. Configure no `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="senha-de-aplicativo-gerada"
FROM_EMAIL="noreply@medmanager.com"
FRONTEND_URL="http://localhost:5173"
```

### Opção 2: SendGrid

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="SG.sua-api-key-aqui"
FROM_EMAIL="noreply@seudominio.com"
FRONTEND_URL="https://seudominio.com"
```

### Opção 3: Mailgun

```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="postmaster@seu-dominio.mailgun.org"
SMTP_PASS="sua-senha-mailgun"
FROM_EMAIL="noreply@seudominio.com"
FRONTEND_URL="https://seudominio.com"
```

### Opção 4: Servidor SMTP Próprio

```env
SMTP_HOST="mail.seudominio.com"
SMTP_PORT="587"
SMTP_USER="usuario@seudominio.com"
SMTP_PASS="senha-smtp"
FROM_EMAIL="noreply@seudominio.com"
FRONTEND_URL="https://seudominio.com"
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão | Obrigatório |
|----------|-----------|--------|-------------|
| `SMTP_HOST` | Servidor SMTP | - | Não* |
| `SMTP_PORT` | Porta SMTP | 587 | Não |
| `SMTP_USER` | Usuário SMTP | - | Não* |
| `SMTP_PASS` | Senha SMTP | - | Não* |
| `FROM_EMAIL` | Email remetente | noreply@medmanager.com | Não |
| `FRONTEND_URL` | URL do frontend | http://localhost:5173 | Sim |

*Se não configurado, entra em modo de desenvolvimento (apenas logs)

## Após Configurar

1. Reinicie o backend:
```bash
docker compose restart backend
```

2. Teste o envio acessando `/forgot-password`

3. Verifique os logs:
```bash
docker compose logs backend -f | grep -i email
```

## Troubleshooting

### Email não enviado
- Verifique as credenciais SMTP no `.env`
- Confirme que a porta não está bloqueada pelo firewall
- Veja logs: `docker compose logs backend --tail=50`

### Token inválido
- Tokens expiram em 30 minutos
- Cada token só pode ser usado uma vez
- Verifique se o token foi copiado corretamente (sem espaços)

### Email não chega
- Verifique pasta de spam
- Confirme que o FROM_EMAIL é válido para seu provedor SMTP
- Alguns provedores exigem verificação de domínio

## Recursos Adicionais

### Template HTML do Email
O template está em `api/src/services/email.service.ts` no método `sendPasswordResetEmail`.

### Logs
Todos os envios são logados em:
- Console: `docker compose logs backend -f`
- Arquivo (se configurado): `api/logs/app.log`

### Segurança
- Tokens são armazenados hasheados no banco
- Expiração automática de 30 minutos
- Tokens de uso único (marcados como usados após reset)
- Rate limiting aplicado nas rotas de autenticação

## Exemplo de Teste com Ethereal (Desenvolvimento)

Para testar com uma caixa de email temporária:

```typescript
// api/src/services/email.service.ts - adicione no constructor:
const testAccount = await nodemailer.createTestAccount();
this.transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass
  }
});
console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
```

Acesse a URL logada para ver o email em uma caixa temporária.
