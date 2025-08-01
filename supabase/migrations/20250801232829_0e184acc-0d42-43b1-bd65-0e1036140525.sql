-- Insert sample CEDIs for testing
INSERT INTO public.cedis (name, location, is_active) VALUES
('CEDI Bogotá', 'Bogotá, Colombia', true),
('CEDI Medellín', 'Medellín, Colombia', true),
('CEDI Cali', 'Cali, Colombia', true),
('CEDI Barranquilla', 'Barranquilla, Colombia', false);

-- Insert sample admin users for each CEDI
INSERT INTO public.users (id, full_name, role, cedi_id) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin Bogotá', 'administrador', 1),
('22222222-2222-2222-2222-222222222222', 'Admin Medellín', 'administrador', 2),
('33333333-3333-3333-3333-333333333333', 'Admin Cali', 'administrador', 3);

-- Insert sample supervisors
INSERT INTO public.users (id, full_name, role, cedi_id) VALUES
('44444444-4444-4444-4444-444444444444', 'Supervisor 1 Bogotá', 'supervisor', 1),
('55555555-5555-5555-5555-555555555555', 'Supervisor 2 Bogotá', 'supervisor', 1),
('66666666-6666-6666-6666-666666666666', 'Supervisor 1 Medellín', 'supervisor', 2),
('77777777-7777-7777-7777-777777777777', 'Supervisor 1 Cali', 'supervisor', 3);

-- Insert sample operators
INSERT INTO public.users (id, full_name, role, cedi_id) VALUES
('88888888-8888-8888-8888-888888888888', 'Operario 1 Bogotá', 'operario', 1),
('99999999-9999-9999-9999-999999999999', 'Operario 2 Bogotá', 'operario', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Operario 3 Bogotá', 'operario', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Operario 1 Medellín', 'operario', 2),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Operario 2 Medellín', 'operario', 2),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Operario 1 Cali', 'operario', 3),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Operario 2 Cali', 'operario', 3),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Operario 3 Cali', 'operario', 3);

-- Create sample system health data for materialized view
CREATE TABLE IF NOT EXISTS public.mv_system_health (
    cedi_id INTEGER,
    cedi_name TEXT,
    health_status TEXT,
    total_operators INTEGER,
    today_production INTEGER,
    pending_approvals INTEGER,
    total_articles INTEGER,
    PRIMARY KEY (cedi_id)
);

-- Insert sample health data
INSERT INTO public.mv_system_health (cedi_id, cedi_name, health_status, total_operators, today_production, pending_approvals, total_articles) VALUES
(1, 'CEDI Bogotá', 'HEALTHY', 3, 15, 2, 150),
(2, 'CEDI Medellín', 'WARNING', 2, 8, 5, 120),
(3, 'CEDI Cali', 'CRITICAL', 2, 3, 8, 80);

-- Insert sample backup log entry
INSERT INTO public.backup_log (backup_type, status, completed_at, file_size_mb) VALUES
('CRITICAL_DATA', 'COMPLETED', NOW() - INTERVAL '2 hours', 256.5);

-- Insert sample production logs for today
INSERT INTO public.production_logs (operario_id, package_id, order_id, quantity_produced, cedi_id, approval_status, recorded_at, approved_at) VALUES
('88888888-8888-8888-8888-888888888888', 1, 1, 10, 1, 'Aprobado', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 hours'),
('99999999-9999-9999-9999-999999999999', 1, 1, 8, 1, 'Aprobado', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 hour'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 1, 5, 1, 'Pendiente', CURRENT_DATE, NULL),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 1, 12, 2, 'Aprobado', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 hours'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 1, 1, 6, 2, 'Pendiente', CURRENT_DATE, NULL),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 1, 1, 3, 3, 'Pendiente', CURRENT_DATE, NULL);