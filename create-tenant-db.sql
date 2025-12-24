-- Criar banco de dados do tenant
CREATE DATABASE medmanager_tenant_demo OWNER postgres;

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE medmanager_tenant_demo TO postgres;
