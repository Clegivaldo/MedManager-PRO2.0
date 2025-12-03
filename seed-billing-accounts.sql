-- Script to create sample billing accounts for testing
-- Using actual tenant IDs from the database

INSERT INTO billing_accounts (
  id, 
  tenant_id, 
  description, 
  amount, 
  due_date, 
  status, 
  paid_at, 
  paid_amount,
  created_at, 
  updated_at
) VALUES 
  -- Tenant Demo accounts
  ('ba-001-' || gen_random_uuid()::text, 'bfed846f-73f4-4316-afc0-50ffa56bb993', 
   'Assinatura Mensal - Setembro 2025', 299.90, '2025-10-05', 'paid', '2025-10-02', 299.90, 
   '2025-09-05 10:00:00'::timestamp, '2025-10-02 14:30:00'::timestamp),
   
  ('ba-002-' || gen_random_uuid()::text, 'bfed846f-73f4-4316-afc0-50ffa56bb993', 
   'Assinatura Mensal - Outubro 2025', 299.90, '2025-11-05', 'pending', NULL, NULL, 
   '2025-10-05 10:00:00'::timestamp, '2025-10-05 10:00:00'::timestamp),
   
  ('ba-003-' || gen_random_uuid()::text, 'bfed846f-73f4-4316-afc0-50ffa56bb993', 
   'Taxa Adicional - Usuarios Excedentes', 99.90, '2025-10-20', 'overdue', NULL, NULL, 
   '2025-10-10 14:00:00'::timestamp, '2025-10-10 14:00:00'::timestamp),
   
  -- Farmacia Demo accounts
  ('ba-004-' || gen_random_uuid()::text, 'ca1372e9-f78a-489f-b2cd-38ead44e95c9', 
   'Assinatura Mensal - Julho 2025', 549.90, '2025-08-05', 'paid', '2025-08-04', 549.90, 
   '2025-07-05 10:00:00'::timestamp, '2025-08-04 09:15:00'::timestamp),
   
  ('ba-005-' || gen_random_uuid()::text, 'ca1372e9-f78a-489f-b2cd-38ead44e95c9', 
   'Assinatura Mensal - Agosto 2025', 549.90, '2025-09-05', 'paid', '2025-09-03', 549.90, 
   '2025-08-05 10:00:00'::timestamp, '2025-09-03 11:20:00'::timestamp),
   
  ('ba-006-' || gen_random_uuid()::text, 'ca1372e9-f78a-489f-b2cd-38ead44e95c9', 
   'Assinatura Mensal - Setembro 2025', 549.90, '2025-10-05', 'paid', '2025-10-05', 549.90, 
   '2025-09-05 10:00:00'::timestamp, '2025-10-05 10:30:00'::timestamp),
   
  ('ba-007-' || gen_random_uuid()::text, 'ca1372e9-f78a-489f-b2cd-38ead44e95c9', 
   'Assinatura Mensal - Outubro 2025', 549.90, '2025-11-05', 'pending', NULL, NULL, 
   '2025-10-05 10:00:00'::timestamp, '2025-10-05 10:00:00'::timestamp);
