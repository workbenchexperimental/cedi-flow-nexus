-- Drop the existing function and recreate it with proper return type
DROP FUNCTION IF EXISTS get_dashboard_metrics_by_role();

-- Recreate the function with correct return type
CREATE OR REPLACE FUNCTION get_dashboard_metrics_by_role()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  user_role public.user_role := get_user_role(auth.uid());
BEGIN
  CASE user_role
    WHEN 'superadministrador' THEN RETURN get_superadmin_dashboard_metrics();
    WHEN 'administrador' THEN RETURN get_cedi_admin_dashboard_metrics();
    WHEN 'supervisor' THEN RETURN get_supervisor_dashboard_metrics();
    WHEN 'operario' THEN RETURN get_operator_dashboard_metrics();
    ELSE RETURN jsonb_build_object('error', 'Rol no reconocido');
  END CASE;
END;
$$;