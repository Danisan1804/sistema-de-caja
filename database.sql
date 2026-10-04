CREATE DATABASE IF NOT EXISTS restaurante_pedidos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurante_pedidos;

CREATE TABLE categorias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  activa TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE productos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT UNSIGNED NULL,
  nombre VARCHAR(120) NOT NULL,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,
  precio_variable TINYINT(1) NOT NULL DEFAULT 0,
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  INDEX idx_productos_disponible (disponible)
) ENGINE=InnoDB;

CREATE TABLE pedidos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estado ENUM('recibido','preparando','finalizado','cancelado') NOT NULL DEFAULT 'recibido',
  tipo_servicio ENUM('aqui','llevar') NOT NULL DEFAULT 'aqui',
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  metodo_pago ENUM('efectivo','transferencia') NULL,
  pagado_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  iniciado_en DATETIME NULL,
  finalizado_en DATETIME NULL,
  INDEX idx_pedidos_estado_fecha (estado, creado_en),
  INDEX idx_pedidos_fecha (creado_en),
  INDEX idx_pedidos_pago_fecha (metodo_pago, creado_en),
  INDEX idx_pedidos_servicio_fecha (tipo_servicio, creado_en)
) ENGINE=InnoDB;

CREATE TABLE pedido_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  nombre_producto VARCHAR(120) NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  instrucciones VARCHAR(500) NULL,
  agregado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  INDEX idx_items_pedido (pedido_id),
  INDEX idx_items_pedido_id (pedido_id, id)
) ENGINE=InnoDB;

CREATE TABLE pedido_eventos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED NOT NULL,
  evento VARCHAR(40) NOT NULL,
  detalle VARCHAR(500) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_eventos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  INDEX idx_eventos_pedido_fecha (pedido_id, creado_en)
) ENGINE=InnoDB;
