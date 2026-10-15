-- ==========================================================================
-- schema.sql  -  Base de datos del proyecto Sazón
-- Crea la base de datos "pedidos_db" y sus 4 tablas:
--   usuarios, productos, pedidos, detalles_pedido
-- Al final agrega 8 productos de prueba (el menú del día).
-- ==========================================================================

-- Para que las tildes y la ñ se guarden bien en cualquier computadora
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS pedidos_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pedidos_db;

-- Borramos las tablas si ya existian (primero las que dependen de otras)
-- OJO: si ejecutas este archivo otra vez, se reinician los datos.
DROP TABLE IF EXISTS detalles_pedido;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS usuarios;

-- --------------------------------------------------------------------------
-- Tabla usuarios: las personas que se registran en la app
-- --------------------------------------------------------------------------
CREATE TABLE usuarios (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  correo    VARCHAR(150) NOT NULL UNIQUE,
  clave     VARCHAR(255) NOT NULL,          -- se guarda encriptada, nunca en texto normal
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------------
-- Tabla productos: los platillos del menú
-- --------------------------------------------------------------------------
CREATE TABLE productos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  precio      DECIMAL(10,2) NOT NULL,
  imagen      VARCHAR(255),                 -- ruta de la foto, ej: images/pizza.png
  disponible  TINYINT(1) NOT NULL DEFAULT 1
);

-- --------------------------------------------------------------------------
-- Tabla pedidos: un registro por cada pedido que hace un usuario
-- --------------------------------------------------------------------------
CREATE TABLE pedidos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  metodo_pago ENUM('tarjeta', 'contra_entrega') NOT NULL,
  notas       VARCHAR(255),
  subtotal    DECIMAL(10,2) NOT NULL,
  envio       DECIMAL(10,2) NOT NULL,
  total       DECIMAL(10,2) NOT NULL,
  estado      VARCHAR(30) NOT NULL DEFAULT 'confirmado',
  creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- --------------------------------------------------------------------------
-- Tabla detalles_pedido: los platillos que trae cada pedido
-- (un pedido puede tener varios platillos)
-- --------------------------------------------------------------------------
CREATE TABLE detalles_pedido (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT NOT NULL,
  producto_id     INT NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,   -- precio al momento de comprar
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- --------------------------------------------------------------------------
-- Datos de prueba: el menú del día
-- --------------------------------------------------------------------------
INSERT INTO productos (nombre, descripcion, precio, imagen) VALUES
('Super combo de hamburguesa',
 'Hamburguesa sencilla con queso, carne de res, tomate, cebolla, lechuga, pepinillos, ketchup y aderezo. Incluye 9 nuggets de pollo, papas fritas tradicionales con su salsa, papas fritas tipo rejilla y bebida a elección.',
 100.00, 'images/combo-hamburguesa.png'),
('Pizza',
 'Pizza de pepperoni recién horneada, con queso derretido y borde relleno.',
 85.00, 'images/pizza.png'),
('Tacos',
 'Orden de tacos crujientes con carne, aguacate, rábano, queso fresco y cilantro.',
 45.00, 'images/tacos.png'),
('Ensalada Santa Fé',
 'Bowl con kale, pollo, quinoa, zanahoria, almendras, camote y aderezos de la casa.',
 55.00, 'images/ensalada.png'),
('Sandwich',
 'Pan artesanal con semillas, queso, tomate seco y rúcula fresca.',
 40.00, 'images/sandwich.png'),
('Quesadillas',
 'Tortillas doradas rellenas de queso y pollo, con pico de gallo y queso rallado.',
 38.00, 'images/quesadillas.png'),
('Pastas',
 'Penne al dente con salsa de tomate de la casa y albahaca fresca.',
 60.00, 'images/pastas.png'),
('Hamburguesas',
 'Hamburguesa doble con queso, pepinillos, tomate y cebolla morada, acompañada de papas fritas.',
 70.00, 'images/hamburguesas.png');
