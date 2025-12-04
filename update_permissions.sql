UPDATE users SET permissions = '["dashboard_view"]'::jsonb WHERE id = '247753e6-a706-485a-960f-8365fb4f3c03';
SELECT id, permissions FROM users WHERE id = '247753e6-a706-485a-960f-8365fb4f3c03';
