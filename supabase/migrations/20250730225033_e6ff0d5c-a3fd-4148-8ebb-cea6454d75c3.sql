-- Insert sample data for PIPR system demonstration

-- Insert sample CEDIs
INSERT INTO public.cedis (name, location, is_active) VALUES
('CEDI Bogotá Norte', 'Bogotá, Colombia', true),
('CEDI Medellín Industrial', 'Medellín, Colombia', true),
('CEDI Cali Valle', 'Cali, Colombia', true),
('CEDI Barranquilla Costa', 'Barranquilla, Colombia', true);

-- Insert sample master articles (components)
INSERT INTO public.master_articles (sku, name, description) VALUES
('COMP-001', 'Tornillo M6x20', 'Tornillo hexagonal acero inoxidable'),
('COMP-002', 'Tuerca M6', 'Tuerca hexagonal acero galvanizado'),
('COMP-003', 'Arandela plana M6', 'Arandela plana acero inoxidable'),
('COMP-004', 'Resorte compresión', 'Resorte de compresión acero templado'),
('COMP-005', 'Carcasa plástica', 'Carcasa principal ABS negro'),
('COMP-006', 'Cable eléctrico', 'Cable multicore 18AWG'),
('COMP-007', 'Conector RJ45', 'Conector ethernet Cat6'),
('COMP-008', 'LED indicador', 'LED verde 5mm alta luminosidad'),
('COMP-009', 'Resistencia 220Ω', 'Resistencia carbón 1/4W'),
('COMP-010', 'Capacitor 100uF', 'Capacitor electrolítico 25V');

-- Insert sample master packages (finished products)
INSERT INTO public.master_packages (name, description) VALUES
('Dispositivo Industrial Alpha', 'Dispositivo de control industrial modelo Alpha'),
('Sensor Temperatura Beta', 'Sensor de temperatura digital modelo Beta'),
('Módulo Comunicación Gamma', 'Módulo de comunicación ethernet modelo Gamma'),
('Panel Control Delta', 'Panel de control HMI modelo Delta'),
('Actuador Automático Epsilon', 'Actuador automático neumático modelo Epsilon');

-- Insert sample master BOMs
INSERT INTO public.master_package_components (master_package_id, master_article_id, quantity_required) VALUES
-- Dispositivo Industrial Alpha (id=1)
(1, 1, 4), (1, 2, 4), (1, 3, 4), (1, 4, 2), (1, 5, 1),
-- Sensor Temperatura Beta (id=2)  
(2, 1, 2), (2, 2, 2), (2, 6, 1), (2, 8, 1), (2, 9, 1),
-- Módulo Comunicación Gamma (id=3)
(3, 5, 1), (3, 6, 2), (3, 7, 1), (3, 8, 2), (3, 10, 1),
-- Panel Control Delta (id=4)
(4, 1, 8), (4, 2, 8), (4, 5, 1), (4, 6, 3), (4, 8, 4),
-- Actuador Automático Epsilon (id=5)
(5, 1, 6), (5, 2, 6), (5, 3, 6), (5, 4, 4), (5, 5, 1);

-- Insert sample groups for CEDI Bogotá Norte
INSERT INTO public.groups (name, cedi_id) VALUES
('Equipo Alpha', 1),
('Equipo Beta', 1),
('Equipo Gamma', 1),
('Turno Nocturno', 1);

-- Insert local articles for CEDI Bogotá Norte (based on master articles)
INSERT INTO public.articles (sku, name, description, cedi_id, master_article_id, current_stock, reorder_point, unit_cost, supplier) VALUES
('COMP-001', 'Tornillo M6x20', 'Tornillo hexagonal acero inoxidable', 1, 1, 500, 100, 0.15, 'Ferretería Industrial SAS'),
('COMP-002', 'Tuerca M6', 'Tuerca hexagonal acero galvanizado', 1, 2, 300, 50, 0.08, 'Ferretería Industrial SAS'),
('COMP-003', 'Arandela plana M6', 'Arandela plana acero inoxidable', 1, 3, 800, 150, 0.05, 'Ferretería Industrial SAS'),
('COMP-004', 'Resorte compresión', 'Resorte de compresión acero templado', 1, 4, 120, 25, 2.50, 'Resortes Colombia Ltda'),
('COMP-005', 'Carcasa plástica', 'Carcasa principal ABS negro', 1, 5, 75, 20, 8.90, 'Plásticos Técnicos SA'),
('COMP-006', 'Cable eléctrico', 'Cable multicore 18AWG', 1, 6, 45, 10, 12.30, 'Cables Eléctricos del Norte'),
('COMP-007', 'Conector RJ45', 'Conector ethernet Cat6', 1, 7, 25, 15, 3.20, 'Conectores Digitales SAS'),
('COMP-008', 'LED indicador', 'LED verde 5mm alta luminosidad', 1, 8, 200, 40, 0.85, 'Componentes LED SA'),
('COMP-009', 'Resistencia 220Ω', 'Resistencia carbón 1/4W', 1, 9, 15, 50, 0.12, 'Electrónicos Bogotá'),
('COMP-010', 'Capacitor 100uF', 'Capacitor electrolítico 25V', 1, 10, 80, 30, 1.45, 'Electrónicos Bogotá');

-- Insert local packages for CEDI Bogotá Norte
INSERT INTO public.packages (name, description, cedi_id, master_package_id, commission_value) VALUES
('Dispositivo Industrial Alpha', 'Dispositivo de control industrial modelo Alpha', 1, 1, 25.00),
('Sensor Temperatura Beta', 'Sensor de temperatura digital modelo Beta', 1, 2, 15.00),
('Módulo Comunicación Gamma', 'Módulo de comunicación ethernet modelo Gamma', 1, 3, 20.00),
('Panel Control Delta', 'Panel de control HMI modelo Delta', 1, 4, 35.00),
('Actuador Automático Epsilon', 'Actuador automático neumático modelo Epsilon', 1, 5, 30.00);

-- Insert local BOMs for CEDI Bogotá Norte (copy from master)
INSERT INTO public.package_components (package_id, article_id, quantity_required) VALUES
-- Dispositivo Industrial Alpha (package_id=1)
(1, 1, 4), (1, 2, 4), (1, 3, 4), (1, 4, 2), (1, 5, 1),
-- Sensor Temperatura Beta (package_id=2)
(2, 1, 2), (2, 2, 2), (2, 6, 1), (2, 8, 1), (2, 9, 1),
-- Módulo Comunicación Gamma (package_id=3)
(3, 5, 1), (3, 6, 2), (3, 7, 1), (3, 8, 2), (3, 10, 1),
-- Panel Control Delta (package_id=4)
(4, 1, 8), (4, 2, 8), (4, 5, 1), (4, 6, 3), (4, 8, 4),
-- Actuador Automático Epsilon (package_id=5)
(5, 1, 6), (5, 2, 6), (5, 3, 6), (5, 4, 4), (5, 5, 1);

-- Insert sample orders for CEDI Bogotá Norte
INSERT INTO public.orders (order_ref, client_name, status, priority, cedi_id, assigned_group_id, expected_delivery_date, total_estimated_cost) VALUES
('ORD-2024-001', 'Industrias ABC SA', 'En Proceso', 5, 1, 1, '2024-02-10', 1250.00),
('ORD-2024-002', 'Manufactura XYZ Ltda', 'Creada', 3, 1, 2, '2024-02-15', 890.00),
('ORD-2024-003', 'Automatización DEF', 'Creada', 4, 1, 1, '2024-02-12', 2100.00),
('ORD-2024-004', 'Sistemas GHI Corp', 'En Proceso', 2, 1, 3, '2024-02-20', 750.00),
('ORD-2024-005', 'Tecnología JKL SAS', 'Completada', 1, 1, 2, '2024-01-28', 580.00);

-- Insert order packages (what needs to be produced for each order)
INSERT INTO public.order_packages (order_id, package_id, quantity_required, quantity_produced_approved) VALUES
-- Order 1: Industrias ABC SA
(1, 1, 10, 7), (1, 2, 15, 15), (1, 3, 5, 3),
-- Order 2: Manufactura XYZ Ltda  
(2, 2, 20, 0), (2, 4, 8, 0),
-- Order 3: Automatización DEF
(3, 1, 25, 5), (3, 4, 12, 2), (3, 5, 8, 0),
-- Order 4: Sistemas GHI Corp
(4, 3, 15, 8), (4, 5, 6, 4),
-- Order 5: Tecnología JKL SAS (completed)
(5, 2, 12, 12), (5, 3, 8, 8);

-- Refresh the materialized view with sample data
REFRESH MATERIALIZED VIEW mv_system_health;