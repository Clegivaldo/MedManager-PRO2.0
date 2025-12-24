-- Criar usuário de teste no banco do tenant
INSERT INTO users (
  id,
  email,
  password,
  name,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'f1234567-89ab-cdef-0123-456789abcdef',
  'admin@farmaciademo.com.br',
  '$2b$10$7DJKa/fKEjLc2Vt7zL6cmu1.0K5A1J8B9C0D1E2F3G4H5I6J7K8L',  -- Password: 123456 (pre-hashed)
  'Admin Farmácia Demo',
  'ADMIN',
  true,
  NOW(),
  NOW()
);


