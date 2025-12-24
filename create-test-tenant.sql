-- Criar um tenant de teste
INSERT INTO tenants (
  id, 
  name, 
  cnpj, 
  database_name, 
  database_user, 
  database_password,
  status, 
  created_at, 
  updated_at, 
  modules_enabled
)
VALUES (
  'e9675bde-126b-429a-a150-533e055e7cc0',
  'Farmácia Demo',
  '12345678000195',
  'medmanager_tenant_demo',
  'tenant_demo_user',
  'tenant_demo_pass_123',
  'active',
  NOW(),
  NOW(),
  '["stock", "fiscal", "financial", "sales"]'::jsonb
)
ON CONFLICT (cnpj) DO UPDATE SET updated_at = NOW();

