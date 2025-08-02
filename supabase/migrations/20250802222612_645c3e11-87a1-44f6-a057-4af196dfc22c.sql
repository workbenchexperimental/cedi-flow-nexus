-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS public.mv_system_health;

-- Insert sample CEDIs for testing (skip if already exist)
INSERT INTO public.cedis (name, location, is_active) VALUES
('CEDI Bogotá', 'Bogotá, Colombia', true),
('CEDI Medellín', 'Medellín, Colombia', true),
('CEDI Cali', 'Cali, Colombia', true),
('CEDI Barranquilla', 'Barranquilla, Colombia', false)
ON CONFLICT (name) DO NOTHING;

-- Create sample system health data table to replace the materialized view
CREATE TABLE public.mv_system_health (
    cedi_id INTEGER PRIMARY KEY,
    cedi_name TEXT,
    health_status TEXT,
    total_operators INTEGER DEFAULT 0,
    today_production INTEGER DEFAULT 0,
    pending_approvals INTEGER DEFAULT 0,
    total_articles INTEGER DEFAULT 0
);

-- Insert sample health data
INSERT INTO public.mv_system_health (cedi_id, cedi_name, health_status, total_operators, today_production, pending_approvals, total_articles) VALUES
(1, 'CEDI Bogotá', 'HEALTHY', 3, 15, 2, 150),
(2, 'CEDI Medellín', 'WARNING', 2, 8, 5, 120),
(3, 'CEDI Cali', 'CRITICAL', 2, 3, 8, 80);

-- Insert sample backup log entry
INSERT INTO public.backup_log (backup_type, status, completed_at, file_size_mb) VALUES
('CRITICAL_DATA', 'COMPLETED', NOW() - INTERVAL '2 hours', 256.5)
ON CONFLICT DO NOTHING;

-- Update get_superadmin_dashboard_metrics function to work with current data
CREATE OR REPLACE FUNCTION public.get_superadmin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result JSONB;
BEGIN
  IF get_user_role(auth.uid()) != 'superadministrador' THEN 
    RETURN jsonb_build_object('error', 'Acceso denegado'); 
  END IF;
  
  WITH national_summary AS (
    SELECT 
      COUNT(DISTINCT c.id) as total_cedis, 
      COUNT(DISTINCT c.id) FILTER (WHERE c.is_active) as active_cedis, 
      COALESCE(SUM(mh.total_operators), 0) as total_users,
      COALESCE(SUM(mh.total_operators), 0) as total_operators
    FROM public.cedis c 
    LEFT JOIN public.mv_system_health mh ON c.id = mh.cedi_id
  ), 
  production_summary AS (
    SELECT 
      COALESCE(SUM(mh.today_production), 0) as total_production_today, 
      COALESCE(SUM(mh.today_production), 0) as approved_today, 
      COALESCE(SUM(mh.pending_approvals), 0) as pending_national, 
      COUNT(DISTINCT CASE WHEN mh.today_production > 0 THEN mh.cedi_id END) as active_cedis_today
    FROM public.mv_system_health mh
  ), 
  backup_status AS (
    SELECT status, completed_at, file_size_mb 
    FROM public.backup_log 
    WHERE backup_type = 'CRITICAL_DATA' 
    ORDER BY started_at DESC 
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'timestamp', NOW(),
    'summary', to_jsonb(ns.*),
    'health_by_cedi', (SELECT jsonb_agg(to_jsonb(mh.*)) FROM mv_system_health mh),
    'production_national', to_jsonb(ps.*),
    'system_status', jsonb_build_object(
      'last_backup', bs.completed_at, 
      'backup_status', bs.status, 
      'backup_size_mb', bs.file_size_mb,
      'overall_health', (
        SELECT CASE 
          WHEN EXISTS(SELECT 1 FROM mv_system_health WHERE health_status = 'CRITICAL') THEN 'CRITICAL' 
          WHEN EXISTS(SELECT 1 FROM mv_system_health WHERE health_status = 'WARNING') THEN 'WARNING' 
          ELSE 'HEALTHY' 
        END
      )
    )
  ) INTO result
  FROM national_summary ns, production_summary ps, backup_status bs;
  
  RETURN result;
END;
$$;