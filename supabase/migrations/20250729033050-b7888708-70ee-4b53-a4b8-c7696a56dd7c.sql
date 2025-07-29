-- #############################################################################
-- #
-- # PIPR - Script Maestro Completo
-- # Versión: 12.0
-- #
-- #############################################################################

-- ========= PARTE 1: DEFINICIÓN DE TIPOS PERSONALIZADOS (ENUMs) =========
CREATE TYPE public.user_role AS ENUM ('superadministrador', 'administrador', 'supervisor', 'operario');
CREATE TYPE public.order_status AS ENUM ('Creada', 'En Proceso', 'Completada', 'Cancelada');
CREATE TYPE public.approval_status AS ENUM ('Pendiente', 'Aprobado', 'Rechazado');
CREATE TYPE public.inventory_movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- ========= PARTE 2: CREACIÓN DE TABLAS CON CONSTRAINTS DE INTEGRIDAD =========
CREATE TABLE public.cedis (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE public.cedis IS 'Almacena los Centros de Distribución de la empresa.';

CREATE TABLE public.users (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'operario',
  cedi_id INT REFERENCES public.cedis(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.users IS 'Perfiles de usuario que extienden la autenticación de Supabase.';

CREATE TABLE public.groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cedi_id INT NOT NULL REFERENCES public.cedis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, cedi_id)
);
COMMENT ON TABLE public.groups IS 'Grupos o equipos de trabajo para los operarios, específicos de cada CEDI.';

CREATE TABLE public.group_members (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id INT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  UNIQUE (user_id, group_id)
);
COMMENT ON TABLE public.group_members IS 'Asigna operarios a grupos de trabajo.';

-- Tablas para el Catálogo Maestro
CREATE TABLE public.master_articles (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.master_articles IS 'Catálogo maestro de componentes, gestionado por el Superadministrador.';

CREATE TABLE public.master_packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.master_packages IS 'Catálogo maestro de productos terminados, gestionado por el Superadministrador.';

CREATE TABLE public.master_package_components (
  id SERIAL PRIMARY KEY,
  master_package_id INT NOT NULL REFERENCES public.master_packages(id) ON DELETE CASCADE,
  master_article_id INT NOT NULL REFERENCES public.master_articles(id) ON DELETE RESTRICT,
  quantity_required INT NOT NULL CHECK (quantity_required > 0),
  UNIQUE (master_package_id, master_article_id)
);
COMMENT ON TABLE public.master_package_components IS 'BOM maestro, define qué componentes componen un paquete maestro.';

-- Tablas locales de cada CEDI
CREATE TABLE public.articles (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cedi_id INT NOT NULL REFERENCES public.cedis(id) ON DELETE CASCADE,
  master_article_id INT REFERENCES public.master_articles(id) ON DELETE SET NULL,
  current_stock INT NOT NULL DEFAULT 0,
  reorder_point INT NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10,4) DEFAULT 0,
  supplier TEXT,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sku, cedi_id),
  CONSTRAINT chk_non_negative_stock CHECK (current_stock >= 0)
);
COMMENT ON TABLE public.articles IS 'Inventario de componentes local de cada CEDI.';

CREATE TABLE public.packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cedi_id INT NOT NULL REFERENCES public.cedis(id) ON DELETE CASCADE,
  master_package_id INT REFERENCES public.master_packages(id) ON DELETE SET NULL,
  commission_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, cedi_id)
);
COMMENT ON TABLE public.packages IS 'Productos terminados habilitados en cada CEDI.';

CREATE TABLE public.package_components (
  id SERIAL PRIMARY KEY,
  package_id INT NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  article_id INT NOT NULL REFERENCES public.articles(id) ON DELETE RESTRICT,
  quantity_required INT NOT NULL CHECK (quantity_required > 0),
  UNIQUE (package_id, article_id)
);
COMMENT ON TABLE public.package_components IS 'BOM local de cada CEDI, usualmente copiado del maestro.';

CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  order_ref TEXT,
  client_name TEXT,
  status public.order_status NOT NULL DEFAULT 'Creada',
  priority INT DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  cedi_id INT NOT NULL REFERENCES public.cedis(id) ON DELETE CASCADE,
  assigned_group_id INT REFERENCES public.groups(id) ON DELETE SET NULL,
  expected_delivery_date DATE,
  total_estimated_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT chk_delivery_date_validation CHECK (expected_delivery_date IS NULL OR expected_delivery_date >= created_at::date)
);
COMMENT ON TABLE public.orders IS 'Órdenes de producción, específicas de cada CEDI.';

CREATE TABLE public.order_packages (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  package_id INT NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  quantity_required INT NOT NULL CHECK (quantity_required > 0),
  quantity_produced_approved INT NOT NULL DEFAULT 0 CHECK (quantity_produced_approved >= 0),
  UNIQUE(order_id, package_id),
  CONSTRAINT chk_no_overproduction CHECK (quantity_produced_approved <= quantity_required)
);
COMMENT ON TABLE public.order_packages IS 'Detalle de paquetes y cantidades requeridas por orden.';

CREATE TABLE public.production_logs (
  id BIGSERIAL PRIMARY KEY,
  operario_id uuid NOT NULL REFERENCES public.users(id),
  package_id INT NOT NULL REFERENCES public.packages(id),
  order_id INT NOT NULL REFERENCES public.orders(id),
  group_id INT REFERENCES public.groups(id),
  cedi_id INT NOT NULL REFERENCES public.cedis(id),
  quantity_produced INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approval_status public.approval_status NOT NULL DEFAULT 'Pendiente',
  supervisor_id_approval uuid REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  CONSTRAINT chk_positive_quantity CHECK (quantity_produced > 0),
  CONSTRAINT chk_valid_supervisor CHECK (
    (approval_status = 'Pendiente' AND supervisor_id_approval IS NULL) OR 
    (approval_status IN ('Aprobado', 'Rechazado') AND supervisor_id_approval IS NOT NULL)
  )
);
COMMENT ON TABLE public.production_logs IS 'Cada registro de producción hecho por un operario.';

CREATE TABLE public.inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  article_id INT NOT NULL REFERENCES public.articles(id),
  cedi_id INT NOT NULL REFERENCES public.cedis(id),
  movement_type public.inventory_movement_type NOT NULL,
  quantity INT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.inventory_movements IS 'Historial de todos los movimientos de inventario.';

CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES public.users(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.audit_log IS 'Registra cambios importantes en tablas críticas para auditoría.';

CREATE TABLE public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.notifications IS 'Almacena notificaciones para los usuarios dentro de la app.';

CREATE TABLE public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  environment TEXT DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
  is_encrypted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id)
);
COMMENT ON TABLE public.system_config IS 'Configuraciones del sistema por ambiente, crítico para operación nacional';

CREATE TABLE public.system_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(15,4) NOT NULL,
  metric_unit TEXT,
  cedi_id INT REFERENCES public.cedis(id),
  metadata JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.system_metrics IS 'Métricas de performance y monitoreo en tiempo real';

CREATE TABLE public.backup_log (
  id BIGSERIAL PRIMARY KEY,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('FULL', 'INCREMENTAL', 'CONFIG', 'CRITICAL_DATA')),
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  file_path TEXT,
  file_size_mb NUMERIC(10,2),
  tables_included TEXT[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retention_until DATE
);
COMMENT ON TABLE public.backup_log IS 'Registro de backups ejecutados para auditoría y recuperación';

-- ========= PARTE 3: ÍNDICES AVANZADOS PARA OPTIMIZACIÓN DE PERFORMANCE =========

CREATE INDEX idx_users_cedi_role ON public.users(cedi_id, role);
CREATE INDEX idx_production_logs_operario_status ON public.production_logs(operario_id, approval_status);
CREATE INDEX idx_production_logs_approval_date ON public.production_logs(approved_at) WHERE approval_status = 'Aprobado';
CREATE INDEX idx_production_logs_order_package ON public.production_logs(order_id, package_id);
CREATE INDEX idx_orders_status_group ON public.orders(status, assigned_group_id);
CREATE INDEX idx_articles_stock_alert ON public.articles(current_stock, reorder_point) WHERE current_stock <= reorder_point;
CREATE INDEX idx_audit_log_table_timestamp ON public.audit_log(table_name, timestamp DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_inventory_movements_article_date ON public.inventory_movements(article_id, created_at DESC);
CREATE INDEX idx_orders_text_search ON public.orders USING gin(to_tsvector('spanish', COALESCE(order_ref, '') || ' ' || COALESCE(client_name, '')));
CREATE INDEX idx_system_config_env ON public.system_config(environment);
CREATE INDEX idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_system_metrics_cedi_time ON public.system_metrics(cedi_id, recorded_at DESC);

-- Índices Críticos Adicionales
CREATE INDEX idx_production_logs_supervisor_pending ON public.production_logs(cedi_id, approval_status, recorded_at DESC) WHERE approval_status = 'Pendiente';
CREATE INDEX idx_production_logs_commissions ON public.production_logs(operario_id, approved_at, cedi_id) WHERE approval_status = 'Aprobado';
CREATE INDEX idx_orders_search_optimized ON public.orders(cedi_id, status, created_at DESC, assigned_group_id);


-- ========= PARTE 4: VISTAS Y VISTAS MATERIALIZADAS PARA REPORTES =========

-- Vista Materializada para el Dashboard de Salud del Sistema (alto rendimiento)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_system_health AS
WITH critical_alerts AS (
  SELECT 
    COUNT(CASE WHEN a.current_stock <= a.reorder_point THEN 1 END) as low_stock_count,
    COUNT(CASE WHEN a.current_stock = 0 THEN 1 END) as out_of_stock_count,
    a.cedi_id
  FROM public.articles a
  GROUP BY a.cedi_id
),
pending_approvals AS (
  SELECT 
    COUNT(*) as pending_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - recorded_at))/3600) as avg_pending_hours,
    cedi_id
  FROM public.production_logs 
  WHERE approval_status = 'Pendiente'
  GROUP BY cedi_id
)
SELECT 
  c.id as cedi_id,
  c.name as cedi_name,
  COALESCE(ca.low_stock_count, 0) as low_stock_alerts,
  COALESCE(ca.out_of_stock_count, 0) as out_of_stock_alerts,
  COALESCE(pa.pending_count, 0) as pending_approvals,
  COALESCE(pa.avg_pending_hours, 0) as avg_pending_hours,
  CASE 
    WHEN COALESCE(ca.out_of_stock_count, 0) > 0 OR COALESCE(pa.avg_pending_hours, 0) > 24 THEN 'CRITICAL'
    WHEN COALESCE(ca.low_stock_count, 0) > 5 OR COALESCE(pa.pending_count, 0) > 50 THEN 'WARNING'
    ELSE 'HEALTHY'
  END as health_status,
  NOW() as calculated_at
FROM public.cedis c
LEFT JOIN critical_alerts ca ON c.id = ca.cedi_id
LEFT JOIN pending_approvals pa ON c.id = pa.cedi_id
WHERE c.is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_system_health ON mv_system_health(cedi_id);
COMMENT ON MATERIALIZED VIEW mv_system_health IS 'Vista materializada para un dashboard de salud del sistema por CEDI. Refrescar periódicamente.';


-- ========= PARTE 5: FUNCIONES AUXILIARES Y DE VALIDACIÓN =========

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid) RETURNS public.user_role AS $$ SELECT role FROM public.users WHERE id = p_user_id; $$ LANGUAGE sql STABLE SECURITY DEFINER;
CREATE OR REPLACE FUNCTION public.get_user_cedi_id(p_user_id uuid) RETURNS INT AS $$ SELECT cedi_id FROM public.users WHERE id = p_user_id; $$ LANGUAGE sql STABLE SECURITY DEFINER;

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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ========= PARTE 6: LÓGICA DE NEGOCIO (FUNCIONES Y TRIGGERS) =========

-- Sincronización de nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN INSERT INTO public.users (id, full_name, role) VALUES (new.id, new.raw_user_meta_data->>'full_name', 'operario'); RETURN new; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger para actualizar timestamp en system_config
CREATE OR REPLACE FUNCTION update_system_config_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_system_config_updated BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION update_system_config_timestamp();

-- Función de gestión de inventario centralizada
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
END; $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Trigger de aprobación mejorado (v2)
CREATE OR REPLACE FUNCTION public.handle_approved_production_v2() RETURNS TRIGGER AS $$
DECLARE order_completed BOOLEAN; component_record RECORD;
BEGIN
  FOR component_record IN SELECT pc.article_id, (pc.quantity_required * NEW.quantity_produced) as qty_needed FROM public.package_components pc WHERE pc.package_id = NEW.package_id LOOP
    PERFORM public.update_article_stock(component_record.article_id, component_record.qty_needed, 'OUT', 'PRODUCTION', NEW.id::TEXT);
  END LOOP;
  UPDATE public.order_packages op SET quantity_produced_approved = op.quantity_produced_approved + NEW.quantity_produced WHERE op.order_id = NEW.order_id AND op.package_id = NEW.package_id;
  UPDATE public.orders o SET status = 'En Proceso' WHERE o.id = NEW.order_id AND o.status = 'Creada';
  SELECT NOT EXISTS (SELECT 1 FROM public.order_packages op WHERE op.order_id = NEW.order_id AND op.quantity_produced_approved < op.quantity_required) INTO order_completed;
  IF order_completed THEN UPDATE public.orders o SET status = 'Completada', completed_at = NOW() WHERE o.id = NEW.order_id; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_production_log_approved ON public.production_logs;
CREATE TRIGGER on_production_log_approved AFTER UPDATE ON public.production_logs FOR EACH ROW WHEN (OLD.approval_status IS DISTINCT FROM 'Aprobado' AND NEW.approval_status = 'Aprobado') EXECUTE PROCEDURE public.handle_approved_production_v2();

-- Trigger de auditoría
CREATE OR REPLACE FUNCTION public.audit_trigger_function() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN INSERT INTO public.audit_log (table_name, record_id, action, old_values, user_id) VALUES (TG_TABLE_NAME, OLD.id::TEXT, TG_OP, row_to_json(OLD)::JSONB, auth.uid()); RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN INSERT INTO public.audit_log (table_name, record_id, action, old_values, new_values, user_id) VALUES (TG_TABLE_NAME, NEW.id::TEXT, TG_OP, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB, auth.uid()); RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN INSERT INTO public.audit_log (table_name, record_id, action, new_values, user_id) VALUES (TG_TABLE_NAME, NEW.id::TEXT, TG_OP, row_to_json(NEW)::JSONB, auth.uid()); RETURN NEW;
  END IF; RETURN NULL;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER audit_production_logs AFTER INSERT OR UPDATE OR DELETE ON public.production_logs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


-- ========= PARTE 7: FUNCIONES RPC PARA DASHBOARDS Y FRONTEND =========

-- 7.1 --- DASHBOARD SUPERADMINISTRADOR (NACIONAL) ---
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7.2 --- DASHBOARD ADMINISTRADOR DE CEDI ---
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7.3 --- DASHBOARD SUPERVISOR ---
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7.4 --- DASHBOARD OPERARIO ---
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7.5 --- FUNCIÓN WRAPPER PARA TODOS LOS DASHBOARDS ---
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ========= PARTE 9: HABILITACIÓN Y CREACIÓN DE POLÍTICAS DE SEGURIDAD (RLS) =========

-- Habilitar RLS en todas las tablas
ALTER TABLE public.cedis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_package_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_log ENABLE ROW LEVEL SECURITY;

-- Políticas para 'cedis'
CREATE POLICY "Superadmin can manage cedis" ON public.cedis FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "Authenticated users can view cedis" ON public.cedis FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para 'users'
CREATE POLICY "Superadmin full access on users" ON public.users FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "Admin CEDI can manage their own users" ON public.users FOR ALL USING (get_user_role(auth.uid()) = 'administrador' AND cedi_id = get_user_cedi_id(auth.uid())) WITH CHECK (cedi_id = get_user_cedi_id(auth.uid()));
CREATE POLICY "Users can view/update own profile" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can view other users in their CEDI" ON public.users FOR SELECT USING (cedi_id = get_user_cedi_id(auth.uid()));

-- Políticas para 'groups' y 'group_members'
CREATE POLICY "Superadmin full access on groups" ON public.groups FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI managers can manage their groups" ON public.groups FOR ALL USING (cedi_id = get_user_cedi_id(auth.uid()) AND get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
CREATE POLICY "CEDI users can view their groups" ON public.groups FOR SELECT USING (cedi_id = get_user_cedi_id(auth.uid()));
CREATE POLICY "Superadmin full access on group_members" ON public.group_members FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI managers can manage their group_members" ON public.group_members FOR ALL USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));

-- Políticas para Catálogo Maestro
CREATE POLICY "Superadmin can manage master catalog" ON public.master_articles FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "Authenticated users can read master catalog" ON public.master_articles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Superadmin can manage master packages" ON public.master_packages FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "Authenticated users can read master packages" ON public.master_packages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Superadmin can manage master components" ON public.master_package_components FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "Authenticated users can read master components" ON public.master_package_components FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para 'articles', 'packages', 'package_components' (Locales)
CREATE POLICY "Superadmin full access on local articles" ON public.articles FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI users can access their local articles" ON public.articles FOR ALL USING (cedi_id = get_user_cedi_id(auth.uid()));
CREATE POLICY "Superadmin full access on local packages" ON public.packages FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI users can access their local packages" ON public.packages FOR ALL USING (cedi_id = get_user_cedi_id(auth.uid()));
CREATE POLICY "Superadmin full access on local components" ON public.package_components FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI users can access their local components" ON public.package_components FOR SELECT USING (EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_id AND p.cedi_id = get_user_cedi_id(auth.uid())));

-- Políticas para 'orders' y 'order_packages'
CREATE POLICY "Superadmin full access on orders" ON public.orders FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI users can access their orders" ON public.orders FOR ALL USING (cedi_id = get_user_cedi_id(auth.uid()));
CREATE POLICY "Superadmin full access on order_packages" ON public.order_packages FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI users can access their order_packages" ON public.order_packages FOR ALL USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.cedi_id = get_user_cedi_id(auth.uid())));

-- Políticas para 'production_logs'
CREATE POLICY "Superadmin full access on production logs" ON public.production_logs FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI users can access logs in their CEDI" ON public.production_logs FOR ALL USING (cedi_id = get_user_cedi_id(auth.uid())) WITH CHECK (cedi_id = get_user_cedi_id(auth.uid()));
CREATE POLICY "Operators can insert their own logs" ON public.production_logs FOR INSERT WITH CHECK (operario_id = auth.uid() AND approval_status = 'Pendiente');

-- Políticas para 'inventory_movements'
CREATE POLICY "Superadmin full access on inventory movements" ON public.inventory_movements FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "CEDI managers can access their inventory movements" ON public.inventory_movements FOR ALL USING (cedi_id = get_user_cedi_id(auth.uid()) AND get_user_role(auth.uid()) IN ('administrador', 'supervisor'));

-- Políticas para 'audit_log'
CREATE POLICY "Superadmin can view all audit logs" ON public.audit_log FOR SELECT USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "Admin CEDI can view their audit logs" ON public.audit_log FOR SELECT USING (get_user_role(auth.uid()) = 'administrador' AND EXISTS (SELECT 1 FROM users u WHERE u.id = audit_log.user_id AND u.cedi_id = get_user_cedi_id(auth.uid())));

-- Políticas para 'notifications'
CREATE POLICY "Users can access their own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- Políticas para nuevas tablas Enterprise
CREATE POLICY "Superadmin full access on system_config" ON public.system_config FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "Admin can view system_config" ON public.system_config FOR SELECT USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor'));
CREATE POLICY "Superadmin full access on metrics" ON public.system_metrics FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');
CREATE POLICY "Admin can view metrics for their CEDI" ON public.system_metrics FOR SELECT USING (get_user_role(auth.uid()) IN ('administrador', 'supervisor') AND (cedi_id IS NULL OR cedi_id = get_user_cedi_id(auth.uid())));
CREATE POLICY "Superadmin only access on backup_log" ON public.backup_log FOR ALL USING (get_user_role(auth.uid()) = 'superadministrador');

-- ========= PARTE 10: CONFIGURACIÓN INICIAL DEL SISTEMA =========

-- Añadir configuraciones por defecto a la tabla system_config
INSERT INTO public.system_config (key, value, description, environment) VALUES
('session_timeout_minutes', '480', 'Timeout de sesión en minutos (8 horas)', 'production'),
('backup_retention_days', '90', 'Días de retención de backups', 'production'),
('maintenance_window', '{"start": "02:00", "end": "04:00", "timezone": "America/Bogota"}', 'Ventana de mantenimiento diario', 'production')
ON CONFLICT (key) DO NOTHING;