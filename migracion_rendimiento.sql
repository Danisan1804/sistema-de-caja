USE restaurante_pedidos;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'pedidos' AND index_name = 'idx_pedidos_pago_fecha') = 0, 'ALTER TABLE pedidos ADD INDEX idx_pedidos_pago_fecha (metodo_pago, creado_en)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'pedidos' AND index_name = 'idx_pedidos_servicio_fecha') = 0, 'ALTER TABLE pedidos ADD INDEX idx_pedidos_servicio_fecha (tipo_servicio, creado_en)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'pedido_items' AND index_name = 'idx_items_pedido_id') = 0, 'ALTER TABLE pedido_items ADD INDEX idx_items_pedido_id (pedido_id, id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
