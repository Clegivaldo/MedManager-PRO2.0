SELECT id, name, cnpj, status, subscription_status, subscription_end FROM public.tenants WHERE cnpj LIKE '123456780001%' OR name LIKE '%Demo%';
