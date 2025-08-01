-- Insert sample CEDIs for testing
INSERT INTO public.cedis (name, location, is_active) VALUES
('CEDI Bogotá', 'Bogotá, Colombia', true),
('CEDI Medellín', 'Medellín, Colombia', true),
('CEDI Cali', 'Cali, Colombia', true),
('CEDI Barranquilla', 'Barranquilla, Colombia', false);

-- Create sample system health data table
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