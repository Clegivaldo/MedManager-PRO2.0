UPDATE tenants SET modules_enabled = '["stock", "fiscal", "financial", "sales", "DASHBOARD"]'::jsonb WHERE id = 'e9675bde-126b-429a-a150-533e055e7cc0';
SELECT modules_enabled FROM tenants WHERE id = 'e9675bde-126b-429a-a150-533e055e7cc0';
