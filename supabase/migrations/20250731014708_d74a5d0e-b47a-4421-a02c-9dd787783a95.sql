-- Create the dashboard metrics function that returns data based on user role
CREATE OR REPLACE FUNCTION get_dashboard_metrics_by_role()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    user_cedi_id UUID;
    result JSON;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('error', 'Usuario no autenticado');
    END IF;
    
    -- Get user role and cedi from users table
    SELECT role, cedi_id INTO user_role, user_cedi_id
    FROM public.users 
    WHERE id = current_user_id;
    
    IF user_role IS NULL THEN
        RETURN json_build_object('error', 'Usuario no encontrado en el sistema');
    END IF;
    
    -- Return data based on role
    CASE user_role
        WHEN 'superadministrador' THEN
            -- Superadmin sees global metrics
            result := json_build_object(
                'timestamp', NOW(),
                'summary', json_build_object(
                    'total_cedis', (SELECT COUNT(*) FROM public.cedis WHERE active = true),
                    'active_cedis', (SELECT COUNT(*) FROM public.cedis WHERE active = true),
                    'total_users', (SELECT COUNT(*) FROM public.users),
                    'total_operators', (SELECT COUNT(*) FROM public.users WHERE role = 'operario')
                ),
                'health_status', 'HEALTHY'
            );
            
        WHEN 'administrador' THEN
            -- Admin sees their CEDI metrics
            result := json_build_object(
                'timestamp', NOW(),
                'cedi_info', json_build_object(
                    'cedi_name', (SELECT name FROM public.cedis WHERE id = user_cedi_id),
                    'total_operators', (SELECT COUNT(*) FROM public.users WHERE role = 'operario' AND cedi_id = user_cedi_id),
                    'total_supervisors', (SELECT COUNT(*) FROM public.users WHERE role = 'supervisor' AND cedi_id = user_cedi_id),
                    'total_groups', 0
                ),
                'inventory', json_build_object(
                    'total_articles', 0,
                    'low_stock_count', 0,
                    'out_of_stock_count', 0,
                    'estimated_value', 0,
                    'stock_health', 'HEALTHY'
                ),
                'production', json_build_object(
                    'today_logs', 0,
                    'pending_approvals', 0,
                    'today_approved', 0,
                    'avg_approval_hours', 0
                ),
                'orders', json_build_object(
                    'orders_created', 0,
                    'orders_in_progress', 0,
                    'orders_completed_today', 0
                ),
                'health_status', 'HEALTHY'
            );
            
        WHEN 'supervisor' THEN
            -- Supervisor sees their team metrics
            result := json_build_object(
                'timestamp', NOW(),
                'pending_approvals', json_build_object(
                    'count', 0,
                    'details', '[]'::json
                ),
                'health_status', 'HEALTHY'
            );
            
        WHEN 'operario' THEN
            -- Operator sees their personal metrics
            result := json_build_object(
                'timestamp', NOW(),
                'operario_info', json_build_object(
                    'name', (SELECT full_name FROM public.users WHERE id = current_user_id)
                ),
                'today_performance', json_build_object(
                    'today_logs', 0,
                    'today_approved', 0,
                    'pending_logs', 0,
                    'today_units', 0
                ),
                'available_work', '[]'::json,
                'health_status', 'HEALTHY'
            );
            
        ELSE
            result := json_build_object('error', 'Rol no reconocido: ' || user_role);
    END CASE;
    
    RETURN result;
END;
$$;