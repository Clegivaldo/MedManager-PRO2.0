UPDATE users 
SET permissions = '["dashboard_view", "dashboard_export"]'::jsonb
WHERE id = 'f1234567-89ab-cdef-0123-456789abcdef' 
AND email = 'admin@farmaciademo.com.br';

SELECT email, role, permissions FROM users WHERE id = 'f1234567-89ab-cdef-0123-456789abcdef';
