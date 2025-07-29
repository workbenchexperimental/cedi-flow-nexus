-- Fix function search path security warnings
-- Set search_path to secure values for all functions

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid) 
RETURNS public.user_role 
AS $$ 
SELECT role FROM public.users WHERE id = p_user_id; 
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix get_user_cedi_id function
CREATE OR REPLACE FUNCTION public.get_user_cedi_id(p_user_id uuid) 
RETURNS INT 
AS $$ 
SELECT cedi_id FROM public.users WHERE id = p_user_id; 
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix get_system_config function
CREATE OR REPLACE FUNCTION public.get_system_config(config_key TEXT, default_value TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  config_value TEXT;
BEGIN
  SELECT (value #>> '{}') INTO config_value 
  FROM public.system_config 
  WHERE key = config_key AND environment = 'production';
  
  RETURN COALESCE(config_value, default_value);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN 
  INSERT INTO public.users (id, full_name, role) 
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'operario'); 
  RETURN new; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix update_system_config_timestamp function
CREATE OR REPLACE FUNCTION update_system_config_timestamp() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- Fix update_article_stock function
CREATE OR REPLACE FUNCTION public.update_article_stock(p_article_id INT, p_quantity INT, p_movement_type public.inventory_movement_type, p_reference_type TEXT, p_reference_id TEXT)
RETURNS JSONB AS $$
DECLARE 
  current_stock_val INT;
  target_cedi_id INT;
BEGIN
  SELECT current_stock, cedi_id INTO current_stock_val, target_cedi_id 
  FROM public.articles WHERE id = p_article_id FOR UPDATE;
  
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Artículo no encontrado'); END IF;
  
  IF p_movement_type = 'OUT' AND (current_stock_val - ABS(p_quantity)) < 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Stock insuficiente', 'current_stock', current_stock_val, 'requested', ABS(p_quantity));
  END IF;
  
  IF p_movement_type = 'IN' THEN
    UPDATE public.articles SET current_stock = current_stock + ABS(p_quantity), last_restocked_at = CASE WHEN p_reference_type = 'PURCHASE' THEN NOW() ELSE last_restocked_at END WHERE id = p_article_id;
  ELSIF p_movement_type = 'OUT' THEN
    UPDATE public.articles SET current_stock = current_stock - ABS(p_quantity) WHERE id = p_article_id;
  ELSIF p_movement_type = 'ADJUSTMENT' THEN
    UPDATE public.articles SET current_stock = p_quantity WHERE id = p_article_id;
  END IF;
  
  INSERT INTO public.inventory_movements (article_id, cedi_id, movement_type, quantity, reference_type, reference_id, created_by)
  VALUES (p_article_id, target_cedi_id, p_movement_type, p_quantity, p_reference_type, p_reference_id, auth.uid());
  
  RETURN jsonb_build_object('success', true, 'message', 'Stock actualizado correctamente', 'new_stock', (SELECT current_stock FROM public.articles WHERE id = p_article_id));
END; 
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix handle_approved_production_v2 function
CREATE OR REPLACE FUNCTION public.handle_approved_production_v2() 
RETURNS TRIGGER AS $$
DECLARE 
  order_completed BOOLEAN; 
  component_record RECORD;
BEGIN
  FOR component_record IN SELECT pc.article_id, (pc.quantity_required * NEW.quantity_produced) as qty_needed FROM public.package_components pc WHERE pc.package_id = NEW.package_id LOOP
    PERFORM public.update_article_stock(component_record.article_id, component_record.qty_needed, 'OUT', 'PRODUCTION', NEW.id::TEXT);
  END LOOP;
  UPDATE public.order_packages op SET quantity_produced_approved = op.quantity_produced_approved + NEW.quantity_produced WHERE op.order_id = NEW.order_id AND op.package_id = NEW.package_id;
  UPDATE public.orders o SET status = 'En Proceso' WHERE o.id = NEW.order_id AND o.status = 'Creada';
  SELECT NOT EXISTS (SELECT 1 FROM public.order_packages op WHERE op.order_id = NEW.order_id AND op.quantity_produced_approved < op.quantity_required) INTO order_completed;
  IF order_completed THEN UPDATE public.orders o SET status = 'Completada', completed_at = NOW() WHERE o.id = NEW.order_id; END IF;
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix audit_trigger_function
CREATE OR REPLACE FUNCTION public.audit_trigger_function() 
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN 
    INSERT INTO public.audit_log (table_name, record_id, action, old_values, user_id) 
    VALUES (TG_TABLE_NAME, OLD.id::TEXT, TG_OP, row_to_json(OLD)::JSONB, auth.uid()); 
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN 
    INSERT INTO public.audit_log (table_name, record_id, action, old_values, new_values, user_id) 
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, TG_OP, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB, auth.uid()); 
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN 
    INSERT INTO public.audit_log (table_name, record_id, action, new_values, user_id) 
    VALUES (TG_TABLE_NAME, NEW.id::TEXT, TG_OP, row_to_json(NEW)::JSONB, auth.uid()); 
    RETURN NEW;
  END IF; 
  RETURN NULL;
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Fix all dashboard functions with secure search path
CREATE OR REPLACE FUNCTION get_superadmin_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF get_user_role(auth.uid()) != 'superadministrador' THEN RETURN jsonb_build_object('error', 'Acceso denegado'); END IF;
  WITH national_summary AS (
    SELECT COUNT(DISTINCT c.id) as total_cedis, COUNT(DISTINCT c.id) FILTER (WHERE c.is_active) as active_cedis, COUNT(DISTINCT u.id) as total_users, COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'operario') as total_operators
    FROM public.cedis c LEFT JOIN public.users u ON c.id = u.cedi_id
  ), production_summary AS (
    SELECT COUNT(*) as total_production_today, COUNT(*) FILTER (WHERE approval_status = 'Aprobado') as approved_today, COUNT(*) FILTER (WHERE approval_status = 'Pendiente') as pending_national, COUNT(DISTINCT cedi_id) as active_cedis_today
    FROM public.production_logs WHERE DATE(recorded_at) = CURRENT_DATE
  ), backup_status AS (
    SELECT status, completed_at, file_size_mb FROM public.backup_log WHERE backup_type = 'CRITICAL_DATA' ORDER BY started_at DESC LIMIT 1
  )
  SELECT jsonb_build_object(
    'timestamp', NOW(),
    'summary', to_jsonb(ns.*),
    'health_by_cedi', (SELECT jsonb_agg(to_jsonb(mh.*)) FROM mv_system_health mh),
    'production_national', to_jsonb(ps.*),
    'system_status', jsonb_build_object(
      'last_backup', bs.completed_at, 'backup_status', bs.status, 'backup_size_mb', bs.file_size_mb,
      'overall_health', (SELECT CASE WHEN EXISTS(SELECT 1 FROM mv_system_health WHERE health_status = 'CRITICAL') THEN 'CRITICAL' WHEN EXISTS(SELECT 1 FROM mv_system_health WHERE health_status = 'WARNING') THEN 'WARNING' ELSE 'HEALTHY' END)
    )
  ) INTO result
  FROM national_summary ns, production_summary ps, backup_status bs;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION get_cedi_admin_dashboard_metrics(p_cedi_id INT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  user_cedi_id INT := COALESCE(p_cedi_id, get_user_cedi_id(auth.uid()));
  result JSONB;
BEGIN
  IF get_user_role(auth.uid()) NOT IN ('administrador', 'supervisor', 'superadministrador') THEN RETURN jsonb_build_object('error', 'Acceso denegado'); END IF;
  WITH cedi_overview AS (
    SELECT c.name as cedi_name, COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'operario') as total_operators, COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'supervisor') as total_supervisors, COUNT(DISTINCT g.id) as total_groups
    FROM public.cedis c LEFT JOIN public.users u ON c.id = u.cedi_id LEFT JOIN public.groups g ON c.id = g.cedi_id
    WHERE c.id = user_cedi_id GROUP BY c.id, c.name
  ), inventory_status AS (
    SELECT COUNT(*) as total_articles, COUNT(*) FILTER (WHERE current_stock <= reorder_point AND current_stock > 0) as low_stock, COUNT(*) FILTER (WHERE current_stock = 0) as out_of_stock, SUM(current_stock * unit_cost) as inventory_value
    FROM public.articles WHERE cedi_id = user_cedi_id
  ), production_metrics AS (
    SELECT COUNT(*) FILTER (WHERE DATE(recorded_at) = CURRENT_DATE) as today_production, COUNT(*) FILTER (WHERE approval_status = 'Pendiente') as pending_approvals, COUNT(*) FILTER (WHERE DATE(approved_at) = CURRENT_DATE) as today_approved, AVG(EXTRACT(EPOCH FROM (approved_at - recorded_at))/3600) FILTER (WHERE approved_at IS NOT NULL AND DATE(approved_at) >= CURRENT_DATE - 7) as avg_approval_hours_week
    FROM public.production_logs WHERE cedi_id = user_cedi_id
  ), orders_status AS (
    SELECT COUNT(*) FILTER (WHERE status = 'Creada') as orders_created, COUNT(*) FILTER (WHERE status = 'En Proceso') as orders_in_progress, COUNT(*) FILTER (WHERE status = 'Completada' AND DATE(completed_at) = CURRENT_DATE) as orders_completed_today
    FROM public.orders WHERE cedi_id = user_cedi_id
  )
  SELECT jsonb_build_object(
    'timestamp', NOW(), 'cedi_info', to_jsonb(co.*),
    'inventory', jsonb_build_object('total_articles', inv.total_articles, 'low_stock_count', inv.low_stock, 'out_of_stock_count', inv.out_of_stock, 'estimated_value', inv.inventory_value, 'stock_health', CASE WHEN inv.out_of_stock > 0 THEN 'CRITICAL' WHEN inv.low_stock > 5 THEN 'WARNING' ELSE 'HEALTHY' END),
    'production', jsonb_build_object('today_logs', pm.today_production, 'pending_approvals', pm.pending_approvals, 'today_approved', pm.today_approved, 'avg_approval_hours', ROUND(pm.avg_approval_hours_week, 2)),
    'orders', to_jsonb(os.*),
    'health_status', (SELECT health_status FROM mv_system_health WHERE cedi_id = user_cedi_id)
  ) INTO result
  FROM cedi_overview co, inventory_status inv, production_metrics pm, orders_status os;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION get_supervisor_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
  user_cedi_id INT := get_user_cedi_id(auth.uid());
  result JSONB;
BEGIN
  IF get_user_role(auth.uid()) NOT IN ('supervisor', 'administrador', 'superadministrador') THEN RETURN jsonb_build_object('error', 'Acceso denegado'); END IF;
  WITH pending_approvals AS (
    SELECT pl.id, u.full_name as operario_name, pl.quantity_produced, pkg.name as package_name, o.order_ref, EXTRACT(EPOCH FROM (NOW() - pl.recorded_at))/3600 as hours_pending
    FROM public.production_logs pl JOIN public.users u ON pl.operario_id = u.id JOIN public.packages pkg ON pl.package_id = pkg.id JOIN public.orders o ON pl.order_id = o.id
    WHERE pl.approval_status = 'Pendiente' AND pl.cedi_id = user_cedi_id ORDER BY pl.recorded_at ASC LIMIT 20
  ), operator_performance AS (
    SELECT u.id as operario_id, u.full_name, COUNT(*) FILTER (WHERE DATE(pl.recorded_at) = CURRENT_DATE) as today_logs, COUNT(*) FILTER (WHERE pl.approval_status = 'Aprobado' AND DATE(pl.approved_at) = CURRENT_DATE) as today_approved, SUM(pl.quantity_produced) FILTER (WHERE pl.approval_status = 'Aprobado' AND DATE(pl.approved_at) = CURRENT_DATE) as today_units
    FROM public.users u LEFT JOIN public.production_logs pl ON u.id = pl.operario_id
    WHERE u.role = 'operario' AND u.cedi_id = user_cedi_id GROUP BY u.id, u.full_name ORDER BY today_units DESC NULLS LAST
  )
  SELECT jsonb_build_object(
    'timestamp', NOW(),
    'pending_approvals', jsonb_build_object('count', (SELECT COUNT(*) FROM public.production_logs WHERE approval_status = 'Pendiente' AND cedi_id = user_cedi_id), 'details', (SELECT jsonb_agg(pa.*) FROM pending_approvals pa)),
    'team_performance', (SELECT jsonb_agg(op.*) FROM operator_performance op WHERE op.today_logs > 0 OR op.today_approved > 0)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION get_operator_dashboard_metrics(p_operario_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  operario_id UUID := COALESCE(p_operario_id, auth.uid());
  user_cedi_id INT := get_user_cedi_id(operario_id);
  result JSONB;
BEGIN
  IF auth.uid() != operario_id AND get_user_role(auth.uid()) NOT IN ('supervisor', 'administrador', 'superadministrador') THEN RETURN jsonb_build_object('error', 'Acceso denegado'); END IF;
  WITH personal_stats AS (
    SELECT COUNT(*) FILTER (WHERE DATE(recorded_at) = CURRENT_DATE) as today_logs, COUNT(*) FILTER (WHERE approval_status = 'Aprobado' AND DATE(approved_at) = CURRENT_DATE) as today_approved, COUNT(*) FILTER (WHERE approval_status = 'Pendiente') as pending_logs, SUM(quantity_produced) FILTER (WHERE approval_status = 'Aprobado' AND DATE(approved_at) = CURRENT_DATE) as today_units
    FROM public.production_logs WHERE operario_id = operario_id
  ), available_orders AS (
    SELECT o.id, o.order_ref, o.priority, COUNT(op.package_id) as total_packages, COUNT(op.package_id) FILTER (WHERE op.quantity_produced_approved >= op.quantity_required) as completed_packages
    FROM public.orders o JOIN public.order_packages op ON o.id = op.order_id LEFT JOIN public.group_members gm ON o.assigned_group_id = gm.group_id
    WHERE o.status IN ('Creada', 'En Proceso') AND o.cedi_id = user_cedi_id AND (o.assigned_group_id IS NULL OR gm.user_id = operario_id)
    GROUP BY o.id, o.order_ref, o.priority HAVING COUNT(op.package_id) FILTER (WHERE op.quantity_produced_approved >= op.quantity_required) < COUNT(op.package_id)
    ORDER BY o.priority DESC, o.expected_delivery_date ASC LIMIT 5
  )
  SELECT jsonb_build_object(
    'timestamp', NOW(),
    'operario_info', jsonb_build_object('name', (SELECT full_name FROM public.users WHERE id = operario_id)),
    'today_performance', to_jsonb(ps.*),
    'available_work', (SELECT jsonb_agg(ao.*) FROM available_orders ao),
    'notifications_count', (SELECT COUNT(*) FROM public.notifications WHERE user_id = operario_id AND read = FALSE)
  ) INTO result
  FROM personal_stats ps;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION get_dashboard_metrics_by_role()
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;