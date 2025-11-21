# 🚀 Guia de Deploy em Produção - MedManager PRO

Este guia descreve os passos para fazer deploy do MedManager PRO em ambiente de produção com TLS automático via Let's Encrypt.

## 📋 Pré-requisitos

1. **Servidor Linux** (Ubuntu 22.04 LTS recomendado)
   - Mínimo: 4GB RAM, 2 CPU cores, 50GB storage
   - Recomendado: 8GB RAM, 4 CPU cores, 100GB storage

2. **Domínio configurado**
   - Registro DNS apontando para o IP do servidor
   - Exemplo: medmanager.seudominio.com.br → 203.0.113.10

3. **Docker e Docker Compose instalados**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

4. **Portas abertas no firewall**
   - 80 (HTTP - redirect)
   - 443 (HTTPS)
   - 22 (SSH para gerenciamento)

## 🔧 Configuração Inicial

### 1. Clonar o repositório

```bash
cd /opt
sudo git clone https://github.com/seu-usuario/MedManager-PRO2.0.git
cd MedManager-PRO2.0
```

### 2. Configurar variáveis de ambiente

```bash
# Copiar template
cp .env.prod.example .env.prod

# Editar com valores reais
nano .env.prod
```

**Variáveis críticas a configurar:**
- `DOMAIN`: Seu domínio (ex: medmanager.farmacia.com.br)
- `ACME_EMAIL`: Email para notificações do Let's Encrypt
- `POSTGRES_PASSWORD`: Senha forte para PostgreSQL
- `REDIS_PASSWORD`: Senha forte para Redis
- `JWT_SECRET`: Chave secreta JWT (mínimo 32 caracteres)
- `JWT_REFRESH_SECRET`: Chave secreta para refresh token
- `SMTP_*`: Configurações de email
- `ASAAS_API_KEY`: Chave da API Asaas (produção)

**Gerar secrets seguros:**
```bash
# JWT Secret
openssl rand -base64 48

# PostgreSQL/Redis passwords
openssl rand -base64 32
```

### 3. Ajustar permissões

```bash
chmod 600 .env.prod
sudo chown root:root .env.prod
```

### 4. Preparar certificados NF-e (se aplicável)

```bash
mkdir -p docker/certs
# Copiar certificado A1 .pfx para docker/certs/
chmod 600 docker/certs/*.pfx
```

## 🚀 Deploy

### 1. Build e iniciar containers

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 2. Verificar status

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

### 3. Executar migrations

```bash
docker compose -f docker-compose.prod.yml exec backend npm run migrate
```

### 4. Seed de dados iniciais

```bash
# Criar planos
docker compose -f docker-compose.prod.yml exec backend npm run seed

# Criar usuário master admin
docker compose -f docker-compose.prod.yml exec backend npx tsx src/scripts/create-master-admin.ts
```

### 5. Verificar TLS

Acesse `https://seu-dominio.com.br` no navegador. O Caddy deve ter obtido certificado automaticamente do Let's Encrypt.

```bash
# Verificar logs do Caddy
docker compose -f docker-compose.prod.yml logs caddy | grep -i certificate
```

## 🔐 Segurança Adicional

### 1. Firewall (UFW)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban (proteção contra brute force)

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Atualizar sistema regularmente

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 4. Backup automático

Configure backups diários do PostgreSQL:

```bash
# Editar crontab
crontab -e

# Adicionar backup diário às 2h AM
0 2 * * * docker compose -f /opt/MedManager-PRO2.0/docker-compose.prod.yml exec -T db pg_dumpall -U postgres | gzip > /opt/backups/medmanager-$(date +\%Y\%m\%d).sql.gz
```

## 📊 Monitoring (Opcional mas Recomendado)

### Instalar Prometheus + Grafana

```bash
# Criar docker-compose.monitoring.yml
# Adicionar serviços prometheus, grafana, node-exporter
docker compose -f docker-compose.monitoring.yml up -d
```

### Configurar Alertas

- Email para notificações de downtime
- Slack/Discord webhook
- Monitorar:
  - CPU/RAM/Disk
  - Tempo de resposta da API
  - Taxa de erro
  - Assinaturas expirando

## 🔄 Atualização

```bash
cd /opt/MedManager-PRO2.0
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npm run migrate
```

## 🆘 Troubleshooting

### Containers não iniciam

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs --tail=100

# Restart de um serviço específico
docker compose -f docker-compose.prod.yml restart backend
```

### TLS não funciona

```bash
# Verificar DNS
nslookup seu-dominio.com.br

# Logs do Caddy
docker compose -f docker-compose.prod.yml logs caddy

# Verificar portas abertas
sudo netstat -tulpn | grep -E ':(80|443)'
```

### Banco de dados corrompido

```bash
# Restaurar último backup
gunzip < /opt/backups/medmanager-20251120.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres
```

## 📚 Próximos Passos

1. **Secrets Manager**: Migrar senhas para AWS Secrets Manager ou HashiCorp Vault
2. **CDN**: Configurar CloudFlare ou AWS CloudFront para assets estáticos
3. **Load Balancer**: Se escalar horizontalmente, usar Kubernetes ou Docker Swarm
4. **Disaster Recovery**: Plano de recuperação de desastres documentado
5. **Compliance**: Auditoria de segurança e conformidade LGPD

## 📞 Suporte

- **Documentação**: [docs/README.md](../docs/README.md)
- **Issues**: https://github.com/seu-usuario/MedManager-PRO2.0/issues
- **Email**: suporte@medmanager.com.br
